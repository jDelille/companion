"use client";

import React, { useState } from "react";
import Modal from "@/components/primitives/modal/Modal";
import { modals, ModalType } from "@/components/people/member-card/memberModals";
import styles from "./ServiceQueue.module.scss";

const ServiceQueue = () => {
  const [open, setOpen] = useState<ModalType | null>(null);
  // Modal to go back to on close (Payment opened from the queue returns to it)
  const [returnTo, setReturnTo] = useState<ModalType | null>(null);
  const current = open ? modals[open] : null;

  const close = () => {
    setOpen(returnTo);
    setReturnTo(null);
  };

  // From inside a modal: remember where we came from
  const openFrom = (type: ModalType) => {
    setReturnTo(open);
    setOpen(type);
  };

  return (
    <div className={styles.serviceQueue}>
      <p className={styles.label}>service queue</p>

      <ul className={styles.queueList}>
        <li className={styles.queueCard} onClick={() => setOpen("payment")}>
            <p>Payment update</p>
            <span>Chen</span>
        </li>
        <li className={styles.queueCard}>
            <p>Guardian request</p>
            <span>Rivera</span>
        </li>
        <li className={styles.queueCard}>
            <p>Trial arrival</p>
            <span>Parker</span>
        </li>
      </ul>

      <button
        className={styles.openQueueBtn}
        onClick={() => setOpen((o) => (o ? null : "serviceQueue"))}
      >
        Open queue
      </button>

      <Modal
        open={!!current}
        label={current?.label ?? ""}
        title={current?.title ?? ""}
        description={current?.description ?? ""}
        onClose={close}
      >
        {current && <current.Body onDone={close} onCancel={close} onOpen={openFrom} />}
      </Modal>
    </div>
  );
};

export default ServiceQueue;
