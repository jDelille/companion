"use client";

import { useEffect, useState } from "react";
import { greetingFor } from "@/domain/kiosk/greeting";

// Uses the kiosk's clock, not the server's, so it has to run in the browser
const Greeting = () => {
  const [greeting, setGreeting] = useState("Welcome"); // what the server renders

  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date().getHours()));
    update();

    // The kiosk can sit on this screen for hours
    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return <p>{greeting}</p>;
};

export default Greeting;
