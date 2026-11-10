import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/demo-mode";

export default function HomePage() {
  redirect(DEMO_MODE ? "/dashboard" : "/login");
}
