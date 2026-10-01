"use client";

import ModalActions from "@/components/primitives/modal/ModalActions";
import styles from "./memberModals.module.scss";
import TagPicker from "./TagPicker";

export type ModalType = "message" | "book" | "payment" | "edit" | "ask" | "serviceQueue";

type BodyProps = {
  onDone: () => void;
  onCancel: () => void;
  onAskAI?: () => void;
  onOpen?: (type: ModalType) => void; // open another modal from this one
};

const MessageBody = ({ onDone, onCancel }: BodyProps) => (
  <>
    <label>
      Recipient
      <input type="text" defaultValue="Lena Chen · Guardian" />
    </label>
    <label>
      Message
      <textarea
        rows={4}
        defaultValue="Hi Lena, this is Dojang following up about Maya's upcoming class."
      />
    </label>
    <ModalActions
      confirmLabel="Preview message"
      onConfirm={onDone}
      onCancel={onCancel}
    />
  </>
);

const BookBody = ({ onDone, onCancel }: BodyProps) => (
  <>
    <ul className={styles.list}>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Children Advanced</p>
          <span>Today · 5:45 PM · Studio A</span>
        </div>
        <div className={styles.optionValue}>17 / 24</div>
      </li>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Saturday Open Mat</p>
          <span>Sat · 10:00 AM · Main floor</span>
        </div>
        <div className={styles.optionValue}>12 / 30</div>
      </li>
    </ul>
    <ModalActions
      confirmLabel="Prepare booking"
      onConfirm={onDone}
      onCancel={onCancel}
    />
  </>
);

const PaymentBody = ({ onDone, onCancel }: BodyProps) => (
  <>
    <div className={styles.currentMembership}>
      <span>Current membership</span>
      <strong>Kids Unlimited · Active</strong>
      <small>Next charge Sep 17 · $149</small>
    </div>
    <ul className={styles.list}>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Payment method</p>
          <span>Visa ending 1842</span>
        </div>
        <div className={styles.optionValue}>Edit</div>
      </li>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Membership contract</p>
          <span>Signed Jan 12, 2025</span>
        </div>
        <div className={styles.optionValue}>Open</div>
      </li>
    </ul>
    {/* <ModalActions
      confirmLabel="Charge"
      onConfirm={onDone}
      onCancel={onCancel}
    /> */}
  </>
);

const EditBody = ({ onDone, onCancel, onAskAI }: BodyProps) => (
  <>
    <div className={styles.row}>
      <label>
        Preferred Name <input type="text" defaultValue="Maya Chen" />
      </label>
      <label>
        Program
        <select defaultValue="children-advanced">
          <option value="children-advanced">Children Advanced</option>
          <option value="children-beginner">Children Beginner</option>
        </select>
      </label>
    </div>
    <label>
      Primary instructor
      <select defaultValue="children-advanced">
        <option value="children-advanced">Master Kim</option>
        <option value="children-beginner">Sarah Park</option>
      </select>
    </label>

    <TagPicker
      options={[
        "Test candidate",
        "Leadership team",
        "Competition team",
        "Sibling discount",
        "Needs follow-up",
      ]}
      defaultSelected={["Test candidate", "Leadership team"]}
    />

    <div className={styles.eligibility}>
      <span>Good eligibility</span>
      <p>✓ Membership valid</p>
      <p>✓ Rank valid</p>
    </div>
    <ModalActions
      confirmLabel="Save changes"
      askAILabel="Ask AI to prepare edit"
      onConfirm={onDone}
      onCancel={onCancel}
      askAI={onAskAI}
    />
  </>
);

const AskAIBody = ({ onDone, onCancel }: BodyProps) => (
  <>
    <div className={styles.scope}>
      <div className={styles.scopeText}>
        <p>Scope</p>
        <p>Maya Chen · Downtown</p>
      </div>
      <div className={styles.scopeValue}>1 member</div>
    </div>
    <div className={styles.row}>
      <div className={styles.permissionBox}>
        <span>Will do</span>
        <ul>
          <li>✓ Check program eligibility</li>
          <li>✓ Prepare instructor assignment</li>
          <li>✓ Show effects before saving</li>
        </ul>
      </div>
      <div className={styles.permissionBox}>
        <span>Will not</span>
        <ul>
          <li>x Change billing</li>
          <li>x Modify rank</li>
          <li>x Write without approval</li>
        </ul>
      </div>
    </div>
    <div className={styles.checkpoint}>
      <span>Human checkpoint</span>
      <p>No change executes until the proposal is reviewed and approved.</p>
    </div>
    <ModalActions
      askAILabel="Ask AI to prepare edit"
      confirmLabel="Prepare proposal"
      onConfirm={onDone}
      onCancel={onCancel}
    />
  </>
);

const ServiceQueueBody = ({ onOpen }: BodyProps) => (
  <>
    <ul className={styles.list}>
      <li className={styles.option} onClick={() => onOpen?.("payment")}>
        <div className={styles.optionText}>
          <p>Payment update</p>
          <span>Chen family · waiting 6 min</span>
        </div>
        <div className={styles.optionValue}>Open</div>
      </li>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Guardian request</p>
          <span>Rivera family · waiting 3 min</span>
        </div>
        <div className={styles.optionValue}>Open</div>
      </li>
      <li className={styles.option}>
        <div className={styles.optionText}>
          <p>Trial arrival</p>
          <span>Parker family · just arrived</span>
        </div>
        <div className={styles.optionValue}>Open</div>
      </li>
    </ul>
  </>
)

export const modals: Record<
  ModalType,
  {
    label: string;
    title: string;
    description: string;
    Body: (props: BodyProps) => React.ReactNode;
  }
> = {
  message: {
    label: "Message",
    title: "Contact the Chen family",
    description:
      "The recipient and member context stay attached to this sub-view.",
    Body: MessageBody,
  },
  book: {
    label: "Book class",
    title: "Choose Maya's next class",
    description: "Eligible sessions from the current Odoo schedule",
    Body: BookBody,
  },
  payment: {
    label: "Billing sub-view",
    title: "Chen family",
    description: "Odoo remains the source of truth for contracts and payments.",
    Body: PaymentBody,
  },
  edit: {
    label: "Edit member",
    title: "Profile & Training",
    description: "Only this task is active; the workspace remains underneath.",
    Body: EditBody,
  },
  ask: {
    label: "✦ Action contract",
    title: "Prepare Maya's program update",
    description:
      "AI prepares a bounded proposal; an authorized person reviews it before Odoo changes.",
    Body: AskAIBody,
  },
  serviceQueue: {
    label: "Service queue",
    title: "Three focused tasks",
    description:"Open one task at a time; completed work returns to this view.",
    Body: ServiceQueueBody,
  },
};
