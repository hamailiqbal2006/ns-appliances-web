"use client";

import React from "react";
import styles from "./admin.module.css";

interface AdminSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
  className?: string;
}

export function AdminSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  id,
  name,
  className,
}: AdminSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      className={`${styles.adminSwitch} ${className || ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={checked ? "true" : "false"}
        />
      )}
      <span className={styles.adminSwitchThumb} aria-hidden />
    </button>
  );
}
