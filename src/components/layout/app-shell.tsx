"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderNavigation,
  HeaderMenuItem,
  SkipToContent,
  Content,
  Search,
  Tag,
  Button,
  Modal,
  Dropdown,
  TextInput,
  InlineNotification,
  Loading,
  Select,
  SelectItem
} from "@carbon/react";
import {
  ChartBar,
  Certificate,
  DataTable,
  UserAvatar,
  Document,
  Link as LinkIcon,
  TrashCan,
  Edit,
  Add,
  CheckmarkFilled,
  ChevronDown,
  ChevronRight,
  Information,
  User,
  Logout,
  Settings
} from "@carbon/icons-react";
import { dashboardMenuItems } from "@/lib/dashboard-config";
import { useDashboardStore } from "@/store/dashboard-store";
import { useChatStore } from "@/store/chat-store";
import { DEMO_MODE, ensureDemoSession } from "@/lib/demo-mode";
import { ChatLauncher } from "@/components/chat/chat-launcher";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { SheetConnection } from "@/lib/source-connection-types";

const activityItems = [
  { id: "visual", label: "Visualizations", icon: ChartBar, href: "/dashboard" },
  { id: "quality", label: "Data Quality", icon: Certificate, href: "/quality" },
  { id: "data", label: "Data Source", icon: DataTable, href: "/data" },
  { id: "settings", label: "Settings", icon: Settings, href: "#" },
] as const;

const ACCEPTED = [".csv", ".xlsx", ".xls"];

async function loadSpreadsheetParser() {
  return import("@/lib/spreadsheet-parser");
}

const isValidGoogleSheetsUrl = (url: string) => {
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.startsWith("/spreadsheets/d/")
    );
  } catch {
    return false;
  }
};

const getSheetNameFromUrl = (url: string): string | null => {
  const match = url.match(/[#?&]sheet=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const uid = useId();

  // Profile Dropdown Menu States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null);
  const isChatOpen = useChatStore((state) => state.isOpen);
  const isChatExpanded = useChatStore((state) => state.isExpanded);
  const {
    columns,
    activeFileName,
    setData,
    setLoading,
    setError,
    parseStatus,
    errorMessage,
    rows,
    setActiveFileName,
    activeDashboardTab,
    setActiveDashboardTab,
    setSourceConnections,
    dashboardTabConnections,
    setDashboardTabConnections,
    areDashboardConnectionsReady,
    setDashboardConnectionsReady
  } = useDashboardStore();

  // Catalog States (Global Sidebar)
  const [connections, setConnections] = useState<SheetConnection[]>([]);
  const [activeSource, setActiveSource] = useState<string>("");
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(true);
  const [isExecutiveDashboardMenuOpen, setIsExecutiveDashboardMenuOpen] = useState(false);
  const [isQsRankingMenuOpen, setIsQsRankingMenuOpen] = useState(false);

  // Settings Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [hasSetTargets, setHasSetTargets] = useState(true);
  const [areTargetsLoaded, setAreTargetsLoaded] = useState(false);
  const ikuTargets = useDashboardStore((state) => state.ikuTargets);
  const setIkuTarget = useDashboardStore((state) => state.setIkuTarget);
  const [tempIkuTargets, setTempIkuTargets] = useState<Record<string, string>>({
    "IKU 001": "80",
    "IKU 002": "80",
    "IKU 003": "80",
    "IKU 005": "80",
    "IKU 007": "80",
    "IKU 009": "80",
  });

  // Reset target loaded status if user session goes away
  useEffect(() => {
    if (!currentUser?.email) {
      setHasSetTargets(true);
      setAreTargetsLoaded(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (isSettingsModalOpen) {
      const targetsStr: Record<string, string> = {};
      Object.entries(ikuTargets).forEach(([key, val]) => {
        targetsStr[key] = String(val);
      });
      setTempIkuTargets(targetsStr);
    }
  }, [isSettingsModalOpen, ikuTargets]);

  // Load IKU targets from database on mount or when currentUser email changes
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadIkuTargets = async () => {
      try {
        const resp = await fetch(`/api/iku-targets?userEmail=${encodeURIComponent(currentUser.email)}`, {
          cache: "no-store",
        });
        if (!resp.ok) {
          setHasSetTargets(false);
          setAreTargetsLoaded(true);
          return;
        }
        const json = await resp.json();
        const keys = json.targets ? Object.keys(json.targets) : [];
        if (keys.length > 0) {
          Object.entries(json.targets).forEach(([key, val]) => {
            setIkuTarget(key, Number(val));
          });
          setHasSetTargets(true);
        } else {
          setHasSetTargets(false);
        }
      } catch {
        setHasSetTargets(false);
      } finally {
        setAreTargetsLoaded(true);
      }
    };

    void loadIkuTargets();
  }, [currentUser?.email, setIkuTarget]);

  const handleSaveSettings = async () => {
    const email = getSessionEmail();
    if (!email) return;

    const targetsNum: Record<string, number> = {};
    Object.entries(tempIkuTargets).forEach(([key, val]) => {
      targetsNum[key] = val === "" ? 80 : Number(val);
    });

    try {
      const resp = await fetch("/api/iku-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          targets: targetsNum
        })
      });
      if (resp.ok) {
        Object.entries(targetsNum).forEach(([key, val]) => {
          setIkuTarget(key, val);
        });
        setHasSetTargets(true);
        setIsSettingsModalOpen(false);
      } else {
        setAlertModal({
          isOpen: true,
          title: "Gagal Menyimpan",
          description: "Gagal menyimpan target IKU ke database. Silakan coba lagi.",
          kind: "danger"
        });
      }
    } catch {
      setAlertModal({
        isOpen: true,
        title: "Kesalahan Koneksi",
        description: "Gagal menghubungi server untuk menyimpan target IKU.",
        kind: "danger"
      });
    }
  };



  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "sheet">("file");
  const [isParsing, setIsParsing] = useState(false);
  const [newConnName, setNewConnName] = useState("");
  const [newConnUrl, setNewConnUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Connection States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<SheetConnection[] | any>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [confirmDeleteConnId, setConfirmDeleteConnId] = useState<string | null>(null);

  // Sheets Selection States
  const [newConnSheets, setNewConnSheets] = useState<string[]>([]);
  const [selectedNewConnSheet, setSelectedNewConnSheet] = useState("");
  const [isLoadingNewConnSheets, setIsLoadingNewConnSheets] = useState(false);

  const [editConnSheets, setEditConnSheets] = useState<string[]>([]);
  const [selectedEditConnSheet, setSelectedEditConnSheet] = useState("");
  const [isLoadingEditConnSheets, setIsLoadingEditConnSheets] = useState(false);

  // Dynamic Alert Modal States
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    kind?: "info" | "danger" | "warning";
  }>({
    isOpen: false,
    title: "",
    description: "",
    kind: "info"
  });
  const [sourceLoadNotice, setSourceLoadNotice] = useState<{
    title: string;
    description: string;
    kind: "error" | "warning";
  } | null>(null);

  const triggerAlert = (title: string, description: string, kind: "info" | "danger" | "warning" = "info") => {
    setAlertModal({
      isOpen: true,
      title,
      description,
      kind
    });
  };

  useEffect(() => {
    if (!sourceLoadNotice) return;

    const timer = window.setTimeout(() => {
      setSourceLoadNotice(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [sourceLoadNotice]);

  const getSessionEmail = () => {
    if (currentUser?.email) return currentUser.email;
    try {
      const raw = localStorage.getItem("iku-user-session");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.email ? String(parsed.email) : "";
    } catch {
      return "";
    }
  };

  const dashboardConnectionByTab = useMemo(
    () => new Map(dashboardTabConnections.map((connection) => [connection.dashboardTab, connection])),
    [dashboardTabConnections]
  );

  const persistConnectionsToServer = async (nextConn: SheetConnection[]) => {
    const email = getSessionEmail().toLowerCase();
    if (!email) throw new Error("SESSION_EMAIL_MISSING");

    const resp = await fetch(`/api/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: email,
        connections: nextConn
      })
    });
    if (!resp.ok) throw new Error("PERSIST_FAILED");
  };

  const saveConnections = async (nextConn: SheetConnection[]) => {
    setConnections(nextConn);
    setSourceConnections(nextConn);
    try {
      await persistConnectionsToServer(nextConn);
      return true;
    } catch {
      return false;
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Protect routes and sync user session on mount/path change
  useEffect(() => {
    const rawUser = DEMO_MODE ? ensureDemoSession() : localStorage.getItem("iku-user-session");
    if (!rawUser) {
      router.push("/login");
    } else {
      try {
        setCurrentUser(JSON.parse(rawUser));
      } catch {
        localStorage.removeItem("iku-user-session");
        router.push("/login");
      }
    }
  }, [router, pathname]);

  // Load source connections from NeonDB.
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadConnections = async () => {
      try {
        const resp = await fetch(`/api/sources?userEmail=${encodeURIComponent(currentUser.email)}`, {
          cache: "no-store"
        });
        if (resp.status === 403) {
          localStorage.removeItem("iku-user-session");
          router.push("/login?google_auth=error&error=" + encodeURIComponent("Akun Anda telah dinonaktifkan. Silakan hubungi admin."));
          return;
        }
        if (!resp.ok) throw new Error("failed");
        const json = await resp.json();
        const parsed = Array.isArray(json.connections) ? (json.connections as SheetConnection[]) : [];
        const effectiveConnections = parsed;
        setConnections(effectiveConnections);
        setSourceConnections(effectiveConnections);

        const sourceFromUrl = new URLSearchParams(window.location.search).get("source");

        if (sourceFromUrl === "active-file") {
          setActiveSource("active-file");
        } else if (sourceFromUrl) {
          const directConn = effectiveConnections.find((c: SheetConnection) => c.id === sourceFromUrl);
          if (directConn) {
            void handleSwitchDataset(directConn);
          }
        }
      } catch {
        setConnections([]);
        setSourceConnections([]);
      }
    };

    void loadConnections();
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.email) {
      setDashboardTabConnections([]);
      setDashboardConnectionsReady(false);
      return;
    }

    const loadDashboardConnections = async () => {
      setDashboardConnectionsReady(false);
      try {
        const resp = await fetch(`/api/dashboard-connections?userEmail=${encodeURIComponent(currentUser.email)}`, {
          cache: "no-store",
        });
        if (resp.status === 403) {
          localStorage.removeItem("iku-user-session");
          router.push("/login?google_auth=error&error=" + encodeURIComponent("Akun Anda telah dinonaktifkan. Silakan hubungi admin."));
          return;
        }
        if (!resp.ok) {
          setDashboardTabConnections([]);
          setDashboardConnectionsReady(true);
          return;
        }

        const json = await resp.json();
        setDashboardTabConnections(Array.isArray(json.connections) ? json.connections : []);
        setDashboardConnectionsReady(true);
      } catch {
        setDashboardTabConnections([]);
        setDashboardConnectionsReady(true);
      }
    };

    void loadDashboardConnections();
  }, [currentUser?.email, setDashboardConnectionsReady, setDashboardTabConnections]);

  // Automatically sync active data source when active dashboard tab changes
  useEffect(() => {
    if (activeDashboardTab === "Overview" || !areDashboardConnectionsReady) return;

    const connection = dashboardTabConnections.find(
      (c) => c.dashboardTab === activeDashboardTab
    );
    if (!connection) return;

    const sourceId = connection.sourceId;
    if (activeSource === sourceId) return;

    const directConn = connections.find((c) => c.id === sourceId);
    if (directConn) {
      void handleSwitchDataset(directConn);
    }
  }, [
    activeDashboardTab,
    dashboardTabConnections,
    connections,
    areDashboardConnectionsReady,
    activeSource
  ]);

  // Listen for global open-upload-modal event
  useEffect(() => {
    const handler = () => setIsUploadModalOpen(true);
    window.addEventListener("app:open-upload-modal", handler);
    return () => window.removeEventListener("app:open-upload-modal", handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ sourceId?: string }>;
      const sourceId = customEvent.detail?.sourceId;
      if (!sourceId) return;

      if (sourceId === "active-file") {
        if (activeFileName) {
          setActiveSource("active-file");
          setActiveSourceUrl("active-file");
        }
        return;
      }

      const directConn = connections.find((c) => c.id === sourceId);
      if (directConn) {
        void handleSwitchDataset(directConn);
      }
    };

    window.addEventListener("app:select-source", handler as EventListener);
    return () => window.removeEventListener("app:select-source", handler as EventListener);
  }, [connections, activeFileName]);

  // Determine active rail item based on pathname
  let activeActivity = "visual";
  if (pathname === "/data") activeActivity = "data";
  else if (pathname === "/quality") activeActivity = "quality";
  else if (pathname === "/dashboard") activeActivity = "visual";

  const handleActivityClick = (id: string, href: string) => {
    if (!hasSetTargets && !DEMO_MODE) {
      setIsSettingsModalOpen(true);
      return;
    }
    if (id === "settings") {
      setIsSettingsModalOpen(true);
      return;
    }
    router.push(href);
  };

  const getBreadcrumbsText = () => {
    if (pathname === "/data") return "Projects / IKU Analytics / Data Source";
    if (pathname === "/quality") return "Projects / IKU Analytics / Data Quality";
    return "Projects / IKU Analytics / Dashboard";
  };

  const setDashboardTabUrl = (tab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", next);
  };

  const setActiveSourceUrl = (sourceId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("source", sourceId);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", next);
  };

  useEffect(() => {
    if (pathname !== "/dashboard") return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab");
      if (tabFromUrl && dashboardMenuItems.some((item) => item === tabFromUrl)) {
        if (tabFromUrl !== activeDashboardTab) setActiveDashboardTab(tabFromUrl);
        return;
      }
      setDashboardTabUrl(activeDashboardTab);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [pathname, activeDashboardTab, router, setActiveDashboardTab]);

  useEffect(() => {
    if (!activeSource) return;
    setActiveSourceUrl(activeSource);
  }, [activeSource]);

  // Load sheets for New Connection URL in background
  useEffect(() => {
    const trimmedUrl = newConnUrl.trim();
    if (!isValidGoogleSheetsUrl(trimmedUrl)) {
      setNewConnSheets([]);
      setSelectedNewConnSheet("");
      return;
    }

    let active = true;
    const fetchSheets = async () => {
      setIsLoadingNewConnSheets(true);
      try {
        const { fetchSpreadsheetSheets } = await loadSpreadsheetParser();
        const sheets = await fetchSpreadsheetSheets(trimmedUrl);
        if (active) {
          setNewConnSheets(sheets);
          const urlSheet = getSheetNameFromUrl(trimmedUrl);
          if (urlSheet && sheets.includes(urlSheet)) {
            setSelectedNewConnSheet(urlSheet);
          } else if (sheets.length > 0) {
            setSelectedNewConnSheet(sheets[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load sheets:", err);
      } finally {
        if (active) setIsLoadingNewConnSheets(false);
      }
    };

    void fetchSheets();
    return () => {
      active = false;
    };
  }, [newConnUrl]);

  // Load sheets for Edit Connection URL in background
  useEffect(() => {
    const trimmedUrl = editUrl.trim();
    if (!isValidGoogleSheetsUrl(trimmedUrl)) {
      setEditConnSheets([]);
      setSelectedEditConnSheet("");
      return;
    }

    let active = true;
    const fetchSheets = async () => {
      setIsLoadingEditConnSheets(true);
      try {
        const { fetchSpreadsheetSheets } = await loadSpreadsheetParser();
        const sheets = await fetchSpreadsheetSheets(trimmedUrl);
        if (active) {
          setEditConnSheets(sheets);
          const urlSheet = getSheetNameFromUrl(trimmedUrl);
          if (urlSheet && sheets.includes(urlSheet)) {
            setSelectedEditConnSheet(urlSheet);
          } else if (sheets.length > 0) {
            setSelectedEditConnSheet(sheets[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load sheets:", err);
      } finally {
        if (active) setIsLoadingEditConnSheets(false);
      }
    };

    void fetchSheets();
    return () => {
      active = false;
    };
  }, [editUrl]);

  // Upload Local File Handler
  const handleUploadFile = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError("Tipe file tidak didukung. Gunakan .csv, .xlsx, atau .xls");
      return;
    }
    try {
      setIsParsing(true);
      setLoading();
      const { parseSpreadsheetFile } = await loadSpreadsheetParser();
      const { rows: parsedRows, columns: parsedColumns } = await parseSpreadsheetFile(file);
      setData(parsedRows, parsedColumns);
      setActiveFileName(file.name);
      setActiveSource("active-file");
      setActiveSourceUrl("active-file");
      setIsUploadModalOpen(false); // Close Modal on success
    } catch {
      setError("Gagal mengurai file. Pastikan format kolom sesuai standar IKU003.");
    } finally {
      setIsParsing(false);
    }
  };

  // Connect Google Sheets or Drive Folder Handler
  const handleConnectSpreadsheet = async () => {
    if (!newConnName.trim() || !newConnUrl.trim()) {
      setError("Nama koneksi dan URL/ID wajib diisi.");
      return;
    }
    try {
      setIsParsing(true);
      setLoading();

      let finalUrl = newConnUrl.trim();
      if (isValidGoogleSheetsUrl(finalUrl) && selectedNewConnSheet) {
        const baseUrl = finalUrl.split("#")[0].split("?")[0];
        finalUrl = `${baseUrl}#sheet=${encodeURIComponent(selectedNewConnSheet)}`;
      }

      const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
      const { parseSpreadsheetUrl } = await loadSpreadsheetParser();
      const { rows: parsedRows, columns: parsedColumns } = await parseSpreadsheetUrl(finalUrl);
      setData(parsedRows, parsedColumns);
      setActiveFileName(newConnName.trim());
      setActiveSource(newId);
      setActiveSourceUrl(newId);

      // Save connection
      const nextConn: SheetConnection[] = [
        ...connections,
        {
          id: newId,
          type: "sheet",
          name: newConnName.trim(),
          url: finalUrl,
        },
      ];
      const saved = await saveConnections(nextConn);
      if (!saved) {
        triggerAlert(
          "Sinkronisasi Tertunda",
          "Koneksi belum tersimpan ke NeonDB. Coba ulangi saat koneksi server stabil.",
          "warning"
        );
      }

      setNewConnName("");
      setNewConnUrl("");
      setIsUploadModalOpen(false); // Close Modal on success
    } catch {
      setError("Gagal memuat koneksi. Periksa kembali URL dan pastikan akses publik spreadsheet terbuka.");
    } finally {
      setIsParsing(false);
    }
  };

  // Switch Active Dataset
  const handleSwitchDataset = async (conn: SheetConnection) => {
    try {
      setIsParsing(true);
      setLoading();
      const { parseSpreadsheetUrl } = await loadSpreadsheetParser();
      const { rows: parsedRows, columns: parsedColumns } = await parseSpreadsheetUrl(conn.url);
      setData(parsedRows, parsedColumns);
      setActiveFileName(conn.name);
      setActiveSource(conn.id);
      setActiveSourceUrl(conn.id);
    } catch {
      setSourceLoadNotice({
        title: "Koneksi Gagal",
        description: "Gagal memuat data dari Spreadsheet. Pastikan tautan masih aktif dan dapat diakses publik.",
        kind: "error"
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Edit Connection Actions
  const handleEditClick = (conn: SheetConnection) => {
    setEditingConn(conn);
    setEditName(conn.name);
    setEditUrl(conn.url);

    const urlSheet = getSheetNameFromUrl(conn.url);
    if (urlSheet) {
      setSelectedEditConnSheet(urlSheet);
    } else {
      setSelectedEditConnSheet("");
    }

    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingConn) return;

    let finalUrl = editUrl.trim();
    if (isValidGoogleSheetsUrl(finalUrl) && selectedEditConnSheet) {
      const baseUrl = finalUrl.split("#")[0].split("?")[0];
      finalUrl = `${baseUrl}#sheet=${encodeURIComponent(selectedEditConnSheet)}`;
    }

    const nextConn: SheetConnection[] = connections.map((c) =>
      c.id === editingConn.id
        ? { ...c, name: editName.trim(), url: finalUrl, type: "sheet" }
        : c
    );
    void saveConnections(nextConn);
    setIsEditModalOpen(false);
  };

  // Delete Connection Handler
  const handleDeleteConnection = (id: string) => {
    const nextConn = connections.filter((c) => c.id !== id);
    void saveConnections(nextConn);
    if (activeSource === id) {
      setActiveSource("");
      setActiveFileName("");
      setData([], []); // Reset store data
    }
  };

  const handleDeleteFile = () => {
    setData([], []);
    setActiveFileName("");
    if (activeSource === "active-file") {
      setActiveSource("");
    }
  };

  return (
    <>
      <Header aria-label="Dashboard DIKTI">
        <SkipToContent />
        <HeaderName href="/dashboard" prefix="Dashboard">
          DIKTI
        </HeaderName>

        <div className="app-header-search">
          <Search
            id="global-search"
            size="sm"
            labelText="Global Search"
            placeholder="Cari dataset, metrik, atau program studi"
          />
        </div>

        <HeaderGlobalBar>
          <ChatLauncher />
          <div style={{ position: "relative", display: "flex", alignItems: "center", height: "100%" }} ref={profileMenuRef}>
            <HeaderGlobalAction
              aria-label="Menu profil pengguna"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid var(--app-header-border, #393939)"
                  }}
                />
              ) : (
                <UserAvatar size={20} />
              )}
            </HeaderGlobalAction>

            {isProfileMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "220px",
                  backgroundColor: "var(--cds-layer-01, #ffffff)",
                  border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  margin: 0
                }}
              >
                {/* User Header Section in Dropdown */}
                {currentUser && (
                  <div style={{ padding: "1rem", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)", margin: "0 0 0.15rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentUser.name}>
                      {currentUser.name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--cds-text-helper, #6f6f6f)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentUser.email}>
                      {currentUser.email}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    triggerAlert(
                      "Profil Pengguna",
                      "Informasi profil detail sedang dimuat. Halaman profil lengkap akan segera hadir dalam rilis berikutnya.",
                      "info"
                    );
                    setIsProfileMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    height: "2.5rem",
                    padding: "0 1rem",
                    border: "none",
                    background: "transparent",
                    color: "var(--cds-text-primary, #161616)",
                    fontSize: "0.8125rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--cds-layer-hover-01, #e5e5e5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <User size={16} style={{ color: "var(--cds-text-secondary, #525252)" }} />
                  <span>Profile</span>
                </button>
                
                <button
                  onClick={() => {
                    localStorage.removeItem("iku-user-session");
                    setIsProfileMenuOpen(false);
                    router.push("/login");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    height: "2.5rem",
                    padding: "0 1rem",
                    border: "none",
                    borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                    background: "transparent",
                    color: "#da1e28",
                    fontSize: "0.8125rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--cds-layer-hover-01, #e5e5e5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Logout size={16} style={{ color: "#da1e28" }} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </HeaderGlobalBar>
      </Header>

      <Content
        className={`app-content${isChatOpen ? " app-content--chat-open" : ""}${isChatExpanded ? " app-content--chat-expanded" : ""}`}
      >
        <div className="app-content-body">
          <div className="dashboard-shell">
            <div className="dashboard-body">
              <aside className="dashboard-activity-rail">
                {activityItems.map(({ id, label, icon: Icon, href }) => (
                  <Button
                    key={id}
                    kind="ghost"
                    hasIconOnly
                    renderIcon={Icon}
                    iconDescription={label}
                    tooltipPosition="right"
                    tooltipAlignment="center"
                    className={`dashboard-activity-rail__item${activeActivity === id ? " is-active" : ""}`}
                    onClick={() => handleActivityClick(id, href)}
                  />
                ))}
              </aside>

              {/* Connected Data Catalog & Fields Tree Sidebar (Telescope) */}
              <aside className="dashboard-left-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {pathname === "/dashboard" ? (
                  <>
                    {/* Halaman /dashboard: Context Menu List Dashboard */}
                    <div className="dashboard-panel-header">
                      <span>Daftar Dashboard</span>
                    </div>
                    <div style={{ flex: "1 1 100%", overflowY: "auto", minHeight: "0" }}>
                      <ul className="sidebar-contained-list">
                        <li className="sidebar-list-item">
                          <button
                            className="sidebar-list-link"
                            onClick={() => setIsDashboardMenuOpen((current) => !current)}
                            aria-expanded={isDashboardMenuOpen}
                            aria-controls={`${uid}-monev-iku-menu`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                              {isDashboardMenuOpen ? (
                                <ChevronDown size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              )}
                              <ChartBar size={16} style={{ color: "#0f62fe", flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                                Monev IKU
                              </span>
                            </div>
                          </button>
                        </li>
                        {isDashboardMenuOpen && (
                          <li id={`${uid}-monev-iku-menu`}>
                            <ul className="sidebar-contained-list">
                                {dashboardMenuItems.map((item) => {
                                  const isActive = activeDashboardTab === item;
                                  const mappedConnection = dashboardConnectionByTab.get(item);
                                  const shouldAutoSelectSource =
                                    item !== "Overview" && Boolean(mappedConnection?.sourceId);
                                  return (
                                    <li key={item} className="sidebar-list-item">
                                      <button
                                        className={`sidebar-list-link${isActive ? " is-active" : ""}`}
                                        onClick={() => {
                                          setDashboardTabUrl(item);
                                          setActiveDashboardTab(item);
                                          if (shouldAutoSelectSource) {
                                            window.dispatchEvent(
                                              new CustomEvent("app:select-source", {
                                                detail: { sourceId: mappedConnection?.sourceId },
                                              })
                                            );
                                          }
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                                          <span style={{ width: "14px", flexShrink: 0 }} aria-hidden="true" />
                                          <ChartBar size={16} style={{ color: isActive ? "#0f62fe" : "var(--cds-text-secondary)", flexShrink: 0 }} />
                                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item}
                                          </span>
                                        </div>
                                        {item !== "Overview" ? (
                                          mappedConnection ? (
                                            <CheckmarkFilled
                                              size={14}
                                              style={{ color: "#198038", flexShrink: 0 }}
                                              title={mappedConnection.sourceLabel}
                                            />
                                          ) : (
                                            <Information
                                              size={14}
                                              style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }}
                                              title="Belum ada mapping sumber data"
                                            />
                                          )
                                        ) : null}
                                      </button>
                                    </li>
                                  );
                                })}
                            </ul>
                          </li>
                        )}
                        <li className="sidebar-list-item">
                          <button
                            className="sidebar-list-link"
                            onClick={() => setIsExecutiveDashboardMenuOpen((current) => !current)}
                            aria-expanded={isExecutiveDashboardMenuOpen}
                            aria-controls={`${uid}-dashboard-eksekutif-menu`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                              {isExecutiveDashboardMenuOpen ? (
                                <ChevronDown size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              )}
                              <ChartBar size={16} style={{ color: "#0f62fe", flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                                Dashboard Eksekutif
                              </span>
                            </div>
                          </button>
                        </li>
                        {isExecutiveDashboardMenuOpen && (
                          <li id={`${uid}-dashboard-eksekutif-menu`}>
                            <ul className="sidebar-contained-list">
                              <li className="sidebar-list-item">
                                <div className="sidebar-list-link" aria-disabled="true" style={{ cursor: "default", opacity: 0.72 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                    <span style={{ width: "14px", flexShrink: 0 }} aria-hidden="true" />
                                    <Document size={16} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      Belum ada item
                                    </span>
                                  </div>
                                </div>
                              </li>
                            </ul>
                          </li>
                        )}
                        <li className="sidebar-list-item">
                          <button
                            className="sidebar-list-link"
                            onClick={() => setIsQsRankingMenuOpen((current) => !current)}
                            aria-expanded={isQsRankingMenuOpen}
                            aria-controls={`${uid}-qs-ranking-menu`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                              {isQsRankingMenuOpen ? (
                                <ChevronDown size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                              )}
                              <Certificate size={16} style={{ color: "#0f62fe", flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                                QS World University Ranking
                              </span>
                            </div>
                          </button>
                        </li>
                        {isQsRankingMenuOpen && (
                          <li id={`${uid}-qs-ranking-menu`}>
                            <ul className="sidebar-contained-list">
                              <li className="sidebar-list-item">
                                <div className="sidebar-list-link" aria-disabled="true" style={{ cursor: "default", opacity: 0.72 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                    <span style={{ width: "14px", flexShrink: 0 }} aria-hidden="true" />
                                    <Document size={16} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      Belum ada item
                                    </span>
                                  </div>
                                </div>
                              </li>
                            </ul>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Halaman /data & /quality: Context Menu Connection Sources Catalog */}
                    <div className="dashboard-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Connected Sources</span>
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Add}
                        iconDescription="Hubungkan Dataset Baru"
                        tooltipPosition="left"
                        tooltipAlignment="center"
                        style={{ width: "24px", height: "24px", minHeight: "auto", padding: 0 }}
                        onClick={() => setIsUploadModalOpen(true)}
                      />
                    </div>
                    
                    <div style={{ flex: "1 1 100%", overflowY: "auto", minHeight: "0" }}>
                      <ul className="sidebar-contained-list">
                        {/* Spreadsheet Connections */}
                        {connections.map((conn) => (
                          <li key={conn.id} className="sidebar-list-item" style={{ borderBottom: "none" }}>
                            <div
                              className={`sidebar-list-link${activeSource === conn.id ? " is-active" : ""}`}
                              style={{ cursor: "pointer" }}
                              onClick={() => void handleSwitchDataset(conn)}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                                <LinkIcon size={16} style={{ color: activeSource === conn.id ? "#0f62fe" : "var(--cds-text-secondary)", flexShrink: 0 }} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {conn.name}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", flexShrink: 0 }}>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={Edit}
                                  iconDescription="Edit Koneksi"
                                  tooltipPosition="left"
                                  style={{ width: "20px", height: "20px", minHeight: "auto", padding: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(conn);
                                  }}
                                />
                                <Button
                                  kind="danger--ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={TrashCan}
                                  iconDescription="Hapus Koneksi"
                                  tooltipPosition="left"
                                  style={{ width: "20px", height: "20px", minHeight: "auto", padding: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteConnId(conn.id);
                                  }}
                                />
                              </div>
                            </div>

                          </li>
                        ))}

                        {/* Empty Catalog State */}
                        {connections.length === 0 && (
                          <div style={{ padding: "1.5rem 1rem", textAlign: "center" }}>
                            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", margin: 0 }}>
                              Klik tombol "+" di atas untuk menghubungkan data.
                            </p>
                          </div>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </aside>

              <main className="dashboard-canvas-workspace">
                {children}
              </main>
            </div>
          </div>
        </div>
        <footer className="app-footer">
          <span>Dashboard DIKTI</span>
          <span>{new Date().getFullYear()} • Internal Data Platform</span>
        </footer>
      </Content>

      <ChatPanel />

      {/* ── Modal Box 1: Global Upload / Connect Dataset (IBM/CDS Design) ── */}
      <Modal
        open={isUploadModalOpen}
        modalHeading="Hubungkan Dataset Baru"
        primaryButtonText="Hubungkan &amp; Muat Data"
        secondaryButtonText="Batal"
        onRequestClose={() => {
          setIsUploadModalOpen(false);
        }}
        onRequestSubmit={() => void handleConnectSpreadsheet()}
        primaryButtonDisabled={isParsing || !newConnName.trim() || !newConnUrl.trim() || isLoadingNewConnSheets}
        size="md"
      >
        {isParsing ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2.5rem 0" }}>
            <Loading withOverlay={false} description="Mengurai data..." />
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", fontWeight: 500, margin: 0 }}>
              Sedang memproses dan menyelaraskan dataset...
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem 0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="upload-sheet-form__grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <TextInput
                  id={`${uid}-modal-conn-name`}
                  labelText="Nama Sumber"
                  placeholder="mis. IKU 2026 Universitas"
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                />
                <TextInput
                  id={`${uid}-modal-conn-url`}
                  labelText="URL Google Sheet"
                  placeholder="Tautan URL Google Sheet publik"
                  value={newConnUrl}
                  onChange={(e) => setNewConnUrl(e.target.value)}
                />
                {isValidGoogleSheetsUrl(newConnUrl) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {isLoadingNewConnSheets ? (
                      <span style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Loading withOverlay={false} small description="Memuat sheet..." style={{ width: "16px", height: "16px" }} />
                        Mengambil daftar sheet...
                      </span>
                    ) : newConnSheets.length > 0 ? (
                      <Dropdown
                        id={`${uid}-modal-conn-sheet`}
                        titleText="Pilih Sheet (Worksheet)"
                        label="Pilih sheet..."
                        items={newConnSheets}
                        selectedItem={selectedNewConnSheet}
                        onChange={({ selectedItem }) => setSelectedNewConnSheet(selectedItem || "")}
                        size="md"
                      />
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--cds-text-error, #da1e28)" }}>
                        Gagal memuat sheet. Pastikan akses publik spreadsheet terbuka.
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)", margin: 0, display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                <Information size={14} aria-hidden="true" style={{ color: "#0f62fe", flexShrink: 0, marginTop: "1px" }} />
                <span>
                  Pastikan spreadsheet Anda memiliki izin akses "Siapa saja yang memiliki link dapat melihat" agar data dapat terbaca.
                </span>
              </p>
            </div>

            {parseStatus === "success" && (
              <InlineNotification
                kind="success"
                title="Berhasil"
                subtitle="Sumber data berhasil diselaraskan dan dimuat ke sistem."
                lowContrast
                hideCloseButton
              />
            )}
            {parseStatus === "error" && errorMessage && (
              <InlineNotification
                kind="error"
                title="Gagal"
                subtitle={errorMessage}
                lowContrast
                hideCloseButton
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmDeleteConnId)}
        modalHeading="Konfirmasi Hapus Koneksi"
        primaryButtonText="Hapus Koneksi"
        secondaryButtonText="Batal"
        danger
        onRequestClose={() => setConfirmDeleteConnId(null)}
        onRequestSubmit={() => {
          if (confirmDeleteConnId) {
            handleDeleteConnection(confirmDeleteConnId);
          }
          setConfirmDeleteConnId(null);
        }}
      >
        <p style={{ margin: 0, color: "var(--cds-text-primary)", fontSize: "0.875rem", lineHeight: "1.5" }}>
          Koneksi sumber data ini akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>

      {/* ── Modal Box 2: Global Edit Connection Modal (IBM/CDS Design) ── */}
      <Modal
        open={isEditModalOpen}
        modalHeading="Edit Koneksi Spreadsheet"
        primaryButtonText="Simpan Perubahan"
        secondaryButtonText="Batal"
        onRequestClose={() => setIsEditModalOpen(false)}
        onRequestSubmit={handleSaveEdit}
        primaryButtonDisabled={!editName.trim() || !editUrl.trim() || isLoadingEditConnSheets}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
          <TextInput
            id={`${uid}-edit-conn-name`}
            labelText="Nama Sumber"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextInput
            id={`${uid}-edit-conn-url`}
            labelText="URL Spreadsheet"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
          />
          {isValidGoogleSheetsUrl(editUrl) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {isLoadingEditConnSheets ? (
                <span style={{ fontSize: "0.75rem", color: "var(--cds-text-helper)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Loading withOverlay={false} small description="Memuat sheet..." style={{ width: "16px", height: "16px" }} />
                  Mengambil daftar sheet...
                </span>
              ) : editConnSheets.length > 0 ? (
                <Dropdown
                  id={`${uid}-edit-conn-sheet`}
                  titleText="Pilih Sheet (Worksheet)"
                  label="Pilih sheet..."
                  items={editConnSheets}
                  selectedItem={selectedEditConnSheet}
                  onChange={({ selectedItem }) => setSelectedEditConnSheet(selectedItem || "")}
                  size="md"
                />
              ) : (
                <span style={{ fontSize: "0.75rem", color: "var(--cds-text-error, #da1e28)" }}>
                  Gagal memuat sheet. Pastikan akses publik spreadsheet terbuka.
                </span>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal Box 3: Dynamic Standardized Alert Modal (IBM/CDS Design) ── */}
      <Modal
        open={alertModal.isOpen}
        modalHeading={alertModal.title}
        primaryButtonText="Mengerti"
        onRequestClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        onRequestSubmit={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        size="xs"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", lineHeight: "1.5", margin: 0 }}>
            {alertModal.description}
          </p>
          {alertModal.kind && alertModal.kind !== "info" && (
            <InlineNotification
              kind={alertModal.kind === "danger" ? "error" : "warning"}
              title={alertModal.kind === "danger" ? "Error Terdeteksi" : "Pemberitahuan"}
              subtitle="Tindakan ini memerlukan perhatian Anda."
              lowContrast
              hideCloseButton
            />
          )}
        </div>
      </Modal>

      {/* ── Modal Box 4: Settings Modal ── */}
      <Modal
        open={isSettingsModalOpen || (areTargetsLoaded && !hasSetTargets && !DEMO_MODE)}
        modalHeading="Pengaturan Target Kinerja Utama (IKU)"
        primaryButtonText="Simpan Perubahan"
        secondaryButtonText={hasSetTargets ? "Batal" : undefined}
        onRequestClose={() => {
          if (hasSetTargets) {
            setIsSettingsModalOpen(false);
          }
        }}
        onRequestSubmit={handleSaveSettings}
        preventCloseOnClickOutside={!hasSetTargets}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem 0" }}>
          {!hasSetTargets && (
            <InlineNotification
              kind="warning"
              title="Target IKU Diperlukan"
              subtitle="Anda harus menentukan target pencapaian IKU terlebih dahulu sebelum dapat mengakses fitur sistem lainnya."
              lowContrast
              hideCloseButton
            />
          )}
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", lineHeight: "1.5", margin: 0 }}>
            Tentukan ambang batas target keberhasilan (%) untuk masing-masing indikator kinerja utama.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {(["IKU 001", "IKU 002", "IKU 003", "IKU 005", "IKU 007", "IKU 009"] as const).map((iku) => (
              <TextInput
                key={iku}
                id={`target-${iku.replace(/\s+/g, "-")}`}
                labelText={`Target ${iku} (%)`}
                type="text"
                value={tempIkuTargets[iku] ?? ""}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                  let finalVal = cleanVal;
                  if (cleanVal !== "") {
                    const num = Number(cleanVal);
                    if (num > 100) {
                      finalVal = "100";
                    } else {
                      finalVal = String(num);
                    }
                  }
                  setTempIkuTargets((prev) => ({
                    ...prev,
                    [iku]: finalVal
                  }));
                }}
              />
            ))}
          </div>
        </div>
      </Modal>

      {sourceLoadNotice && (
        <div
          style={{
            position: "fixed",
            top: "5rem",
            right: "1.5rem",
            zIndex: 10000,
            width: "min(28rem, calc(100vw - 3rem))"
          }}
        >
          <InlineNotification
            kind={sourceLoadNotice.kind}
            title={sourceLoadNotice.title}
            subtitle={sourceLoadNotice.description}
            lowContrast
            onCloseButtonClick={() => setSourceLoadNotice(null)}
          />
        </div>
      )}
    </>
  );
}
