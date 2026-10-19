"use client";

import { useSyncExternalStore } from "react";

type Props = {
  iso: string;
  format?: Intl.DateTimeFormatOptions; // default: "Oct 7, 5:47 PM"
};

const defaultFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const noSubscription = () => () => {};

// A time in the viewer's time zone. Formatted in the browser only: the server
// renders the page first and its time zone may not be the viewer's.
const LocalTime = ({ iso, format = defaultFormat }: Props) => {
  const text = useSyncExternalStore(
    noSubscription,
    () => new Date(iso).toLocaleString([], format),
    () => "",
  );
  return <time dateTime={iso}>{text}</time>;
};

export default LocalTime;
