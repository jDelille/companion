"use client";

import { useState } from "react";
import useVoice from "@/components/ai/voice/useVoice";
import MicIcon from "@/components/ai/voice/MicIcon";
import styles from "./AgentComposer.module.scss";

type Props = {
  onRequest: (text: string) => boolean;
};

const AgentComposer = ({ onRequest }: Props) => {
  const [text, setText] = useState("");
  const [missed, setMissed] = useState(false);

  const send = (input: string) => {
    const understood = onRequest(input);
    setMissed(!understood);
    setText("");
  };

  // Spoken text runs like a typed request
  const voice = useVoice(send);

  return (
    <form
      className={styles.agentComposer}
      onSubmit={(e) => {
        e.preventDefault();
        send(text);
      }}
    >
      <input
        type="text"
        placeholder={missed ? 'Not sure how to help. Try "email the parents"' : "Ask the agent..."}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setMissed(false);
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
      <button type="submit" className={styles.agentBtn}>
        ↑
      </button>
    </form>
  );
};

export default AgentComposer;
