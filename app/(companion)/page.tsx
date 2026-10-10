import { redirect } from "next/navigation";
import { odooTestMode } from "@/server/odoo-runtime";

export default function Home() {
  redirect(odooTestMode() ? "/ops" : "/people/5001");
}
