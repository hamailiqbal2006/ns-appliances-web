import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NS Admin",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Zero-flash anti-flicker theme initialization script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('ns_admin_theme_v1');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('admin-dark');}else{document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('admin-dark');}}catch(e){}})()`,
        }}
      />
      {children}
    </>
  );
}
