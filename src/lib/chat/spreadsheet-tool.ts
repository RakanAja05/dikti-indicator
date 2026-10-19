import { prisma } from "@/lib/prisma";
import { parseSpreadsheetUrl } from "@/lib/spreadsheet-parser";
import { calculateKpis, filterRows, normalizeRows } from "@/lib/data-helpers";
import type { AuthContext, ToolRequest, ToolResult } from "@/lib/chat/types";
import type { RawRow, CanonicalKey } from "@/types/data";

const MAX_ROWS = 200;

/**
 * Get available filters (years, faculties, degrees) from user's data source.
 * Ini dipakai untuk "no_match" response.
 */
export async function getAvailableFilters(user: AuthContext): Promise<{
  years?: string[];
  faculties?: string[];
  degrees?: string[];
}> {
  const connections = await prisma.dataSourceConnection.findMany({
    where: { userEmail: user.email },
    orderBy: { createdAt: "asc" },
  });

  if (connections.length === 0) {
    return {};
  }

  const connection = connections[0];
  try {
    const { rows } = await parseSpreadsheetUrl(connection.url);
    const normalized = normalizeRows(rows);

    const years = Array.from(new Set(normalized.map((r) => r.year).filter(Boolean))) as string[];
    const faculties = Array.from(new Set(normalized.map((r) => r.faculty).filter(Boolean))) as string[];
    const degrees = Array.from(new Set(normalized.map((r) => r.degree).filter(Boolean))) as string[];

    return { years, faculties, degrees };
  } catch {
    return {};
  }
}

/**
 * Execute tool request berdasarkan indicator dan filter.
 * Gunakan dashboard_tab_connection.source_id untuk mendapatkan source yang benar.
 */
export async function executeTool(
  user: AuthContext,
  request: ToolRequest
): Promise<ToolResult> {
  const { indicator, year, faculty, degree, aggregation = "none", column } = request;

  // Ambil connection untuk tab IKU tertentu dari dashboard_tab_connection
  const tabConnection = await prisma.dashboardTabConnection.findUnique({
    where: {
      userEmail_dashboardTab: {
        userEmail: user.email,
        dashboardTab: indicator,
      },
    },
  });

  // Fallback: jika tidak ada connection untuk tab ini, ambil connection pertama
  const connections = await prisma.dataSourceConnection.findMany({
    where: { userEmail: user.email },
    orderBy: { createdAt: "asc" },
  });

  if (connections.length === 0) {
    return {
      status: "no_source",
      message: "User belum menghubungkan spreadsheet/data source apa pun.",
    };
  }

  const connection = tabConnection
    ? connections.find((c) => c.id === tabConnection.sourceId)
    : connections[0];

  if (!connection) {
    return {
      status: "no_source",
      message: "Tidak dapat menemukan data source yang terhubung.",
    };
  }

  try {
    const { rows } = await parseSpreadsheetUrl(connection.url);
    const totalRows = rows.length;

    if (totalRows === 0) {
      const filters = await getAvailableFilters(user);
      return {
        status: "no_match",
        message: "Sheet kosong atau tidak ada data yang dapat diproses.",
        availableFilters: filters,
      };
    }

    const normalized = normalizeRows(rows);

    // Apply filters
    const filters = {
      year: year || "",
      faculty: faculty || "",
      degree: degree || "",
      search: "",
    };

    const filteredRows = filterRows(normalized, filters);
    const matchedRows = filteredRows.length;

    if (matchedRows === 0) {
      const filtersAvail = await getAvailableFilters(user);
      return {
        status: "no_match",
        message: `Tidak ada data yang cocok dengan filter: ${JSON.stringify(filters)}`,
        availableFilters: filtersAvail,
      };
    }

    // Aggregation
    let data: { rows: RawRow[] } | { value: number; column: string } = { rows: [], column: "" as const };
    let summary = calculateKpis(filteredRows);

if (aggregation === "none") {
      // Return max 200 rows dari hasil filter
      const rowsToShow = filteredRows.slice(0, MAX_ROWS).map((r) => r.__raw as RawRow);
      const truncated = matchedRows > MAX_ROWS;
      data = { rows: rowsToShow };
      if (truncated) {
        summary = { ...summary, totalStudyProgram: summary.totalStudyProgram };
      }
    } else {
      // Aggregation
      let aggValue = 0;

      if (aggregation === "count") {
        aggValue = matchedRows;
        data = { value: aggValue, column: "count" };
      } else if (aggregation === "sum") {
        if (!column) {
          return {
            status: "error",
            message: "Aggregasi sum memerlukan parameter 'column'.",
          };
        }
        const sumVal = filteredRows.reduce((acc, r) => {
          const raw = r.__raw as RawRow;
          const val = (column in raw ? raw[column as CanonicalKey] : 0) ?? 0;
          return acc + (typeof val === "number" ? val : 0);
        }, 0);
        aggValue = sumVal;
        data = { value: aggValue, column: column as string };
      } else if (aggregation === "avg") {
        if (column === "iku_percentage") {
          return {
            status: "error",
            message: "Aggregasi avg tidak boleh untuk kolom iku_percentage. Gunakan sum atau none.",
          };
        }
        const nums: (number | string)[] = [];
        for (const r of filteredRows) {
          const raw = r.__raw as RawRow;
          const val = (column && column in raw) ? raw[column as CanonicalKey] : undefined;
          if (val !== undefined && val !== null) {
            if (typeof val === "number" || typeof val === "string") {
              nums.push(val);
            }
          }
        }
        const numeric = nums.map((v) => (typeof v === "number" ? v : Number(v))).filter((v) => !isNaN(v));
        if (numeric.length === 0) {
          aggValue = 0;
        } else {
          aggValue = numeric.reduce((a, b) => a + b, 0) / numeric.length;
        }
        data = { value: aggValue, column: column as string };
      }

      summary = calculateKpis(filteredRows);
    }

    const truncated = totalRows > MAX_ROWS && aggregation === "none";

    return {
      status: "ok",
      source: { id: connection.id, name: connection.name },
      indicator,
      filters: { year: filters.year || undefined, faculty: filters.faculty || undefined, degree: filters.degree || undefined },
      aggregation,
      matchedRows,
      totalRows,
      truncated,
      summary: {
        totalStudyProgram: summary.totalStudyProgram,
        totalFaculty: summary.totalFaculty,
        totalLecturers: summary.totalLecturers,
        totalIkuQualified: summary.totalIkuQualified,
        avgIkuPercentage: summary.avgIkuPercentage,
        totalPartners: summary.totalPartners,
      },
      data,
    };
  } catch (error) {
    console.error("Error parsing spreadsheet:", error);
    return {
      status: "error",
      message: "Gagal memproses spreadsheet. Pastikan URL valid dan sheet dapat diakses.",
    };
  }
}
