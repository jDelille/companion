"use client";

import { useState } from "react";
import useVoice from "@/components/ai/voice/useVoice";
import MicIcon from "@/components/ai/voice/MicIcon";
import type { RequestStatus } from "./useCompanion";
import styles from "./AgentComposer.module.scss";

type Props = {
  status: RequestStatus;
  onRequest: (text: string) => void;
  onTyping: () => void;
};

const statusMessages: Record<RequestStatus, string> = {
  idle: "",
  thinking: "Thinking…",
  understood: "Result ready above.",
  notUnderstood: 'Try "show attendance" on a member or "show class roster" on a class. Use the parent follow-up form to prepare a draft.',
  unavailable: "The agent isn't available right now. Try again.",
};

const AgentComposer = ({ status, onRequest, onTyping }: Props) => {
  const [text, setText] = useState("");

  const send = (input: string) => {
    onRequest(input);
    setText("");
  };

  // Spoken text runs like a typed request
  const voice = useVoice(send);

  return (
    <div className={styles.composerArea}>
      {/* Always rendered, so screen readers announce each new message */}
      <p className={styles.requestStatus} data-status={status} role="status">
        {statusMessages[status]}
      </p>

      <form
        className={styles.agentComposer}
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          type="text"
          placeholder={status === "thinking" ? "Thinking…" : "Ask the agent..."}
          aria-label="Ask the agent"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
        />
        <button
          type="button"
          className={styles.micBtn}
          onClick={voice.start}
          aria-label="Speak to the agent"
        >
          {voice.listening ? "●" : <MicIcon />}
        </button>
        <button type="submit" className={styles.agentBtn} aria-label="Send">
          ↑
        </button>
      </form>
    </div>
  );
};

export default AgentComposer;
