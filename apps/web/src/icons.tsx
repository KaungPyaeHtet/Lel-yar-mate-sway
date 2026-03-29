import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Base({
  title,
  children,
  viewBox = "0 0 24 24",
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width="1.35em"
      height="1.35em"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Farm / homestead — main screen */
export function IconHome(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3L2 12h3v8h5v-6h4v6h5v-8h3L12 3zm0 2.2l6 5.4V18h-1v-6H7v6H6v-7.4l6-5.4z" />
      <path d="M10 10h4v2h-4v-2z" opacity="0.85" />
    </Base>
  );
}

/** Market / shop storefront — စျေးကွက် */
export function IconMarket(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18.36 9l.6 2H5.04l.6-2h12.72zM20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z" />
    </Base>
  );
}

/** Sun and cloud — weather */
export function IconWeather(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 18h10.5a3.5 3.5 0 0 0 .3-7 4.5 4.5 0 0 0-8.7-1.2A3.5 3.5 0 0 0 7 18z" />
      <circle cx="16.5" cy="8" r="2.25" />
    </Base>
  );
}

/** Newspaper — news & advisories */
export function IconNews(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 4h11v16H5V4zm2 2v2h7V6H7zm0 4v2h7v-2H7zm0 4v2h4v-2H7z" />
      <path d="M17 6h2v12a2 2 0 0 1-2 2v-14z" opacity="0.85" />
    </Base>
  );
}

/** Gear — settings */
export function IconSettings(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.5-4.5v3l-2.2.6c-.1.4-.3.8-.5 1.1l1.3 2.1-2.1 2.1-2.1-1.3c-.4.2-.7.4-1.1.5l-.6 2.2h-3l-.6-2.2c-.4-.1-.8-.3-1.1-.5l-2.1 1.3-2.1-2.1 1.3-2.1c-.2-.3-.4-.7-.5-1.1l-2.2-.6v-3l2.2-.6c.1-.4.3-.8.5-1.1L3.6 7.3 5.7 5.2l2.1 1.3c.3-.2.7-.4 1.1-.5l.6-2.2h3l.6 2.2c.4.1.8.3 1.1.5l2.1-1.3 2.1 2.1-1.3 2.1c.2.3.4.7.5 1.1l2.2.6z" />
    </Base>
  );
}

export function IconLocationPin(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2C8.7 2 6 4.5 6 7.8c0 4.2 4.7 8.5 5.6 9.4l.4.4.4-.4c.9-.9 5.6-5.2 5.6-9.4C18 4.5 15.3 2 12 2zm0 9.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z" />
    </Base>
  );
}

export function IconCity(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20h16v-2H4v2zm2-4h3V8H6v8zm5 0h3V4h-3v16zm5 0h3v-6h-3v6z" />
    </Base>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V8c2.76 0 5 2.24 5 5 0 1.13-.37 2.16-1 3l1.49 1.49c1.12-1.24 1.8-2.9 1.8-4.69 0-1.85-.71-3.54-1.86-4.81zM12 18c-2.76 0-5-2.24-5-5 0-1.13.37-2.16 1-3L6.51 8.51A7.92 7.92 0 0 0 4 12c0 4.42 3.58 8 8 8v3l5-5-5-5v3z" />
    </Base>
  );
}

export function IconSprout(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 22c0-4 2-8 6-10-4 0-6 3-6 6 0-3-2-6-6-6 4 2 6 6 6 10z" />
      <path
        d="M12 12v10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </Base>
  );
}

/** News filter: all sources */
export function IconGlobeSimple(props: IconProps) {
  return (
    <Base {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4"
        ry="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 12h18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </Base>
  );
}

/** News filter: Myanmar */
export function IconFlagSimple(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 3v18h2v-8l4 2 5-8v11h3V4l-6 1-3 5V3H5z" />
    </Base>
  );
}

/** News filter: international */
export function IconAirplane(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </Base>
  );
}

/** Myanmar / conversational text */
export function IconLanguage(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
    </Base>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 3v18h18v-2H5V3H3zm14 4v10h2V7h-2zm-4 3v7h2v-7h-2zm-4 4v3h2v-3H9z" />
    </Base>
  );
}

export function IconInformation(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </Base>
  );
}
