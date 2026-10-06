import WelcomeScreen from "@/components/kiosk/screens/WelcomeScreen";
import { SCHOOL_NAME } from "@/domain/kiosk/kioskConfig";

export default function KioskPage() {
  return <WelcomeScreen schoolName={SCHOOL_NAME} />;
}
