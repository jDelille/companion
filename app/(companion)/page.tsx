import { redirect } from "next/navigation";

// No Today page yet: send "/" to People for now (307, temporary, so it's easy to undo)
export default function Home() {
  redirect("/people/5001");
}
