"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Modal.module.scss";

type Props = {
	open: boolean;
	label: string; // small eyebrow above the title: "Book class"
	title: string;
	description: string;
	onClose: () => void;
	children: ReactNode;
	hideClose?: boolean; // hide the small x (e.g. kiosk, where every target must be 48px+)
	centered?: boolean; // phones: sit in the middle instead of pinned to the bottom (kiosk popups)
};

export default function Modal({
	open,
	label,
	title,
	description,
	onClose,
	children,
	hideClose = false,
	centered = false,
}: Props) {
	const ref = useRef<HTMLDialogElement>(null);
	const id = useId();

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			className={centered ? `${styles.modal} ${styles.centered}` : styles.modal}
			aria-labelledby={`${id}-title`}
			aria-describedby={`${id}-description`}
			onCancel={(e) => {
				// Escape key: let the parent decide, so it can swap to another modal instead of closing
				e.preventDefault();
				onClose();
			}}
			onClick={(e) => e.target === ref.current && onClose()} // click outside
		>
			<div className={styles.inner}>
				<header className={styles.header}>
					<div>
						<span className={styles.label}>{label}</span>
						<h2 id={`${id}-title`}>{title}</h2>
						<p id={`${id}-description`}>{description}</p>
					</div>
					{!hideClose && (
						<button onClick={onClose} aria-label="Close">
							✕
						</button>
					)}
				</header>
				<div className={styles.body}>{children}</div>
			</div>
		</dialog>
	);
}
