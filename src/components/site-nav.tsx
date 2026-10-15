import Link from "next/link";

export function SiteNav({ detail = false }: { detail?: boolean }) {
  const root = detail ? "/" : "";
  return <header className="site-nav" aria-label="Primary navigation">
    <Link className="nav-mark" href="/" aria-label="NS Home Appliances home"><b>NS</b><span>Home Appliances</span></Link>
    <nav className="nav-actions"><a href={`${root}#categories`}>Categories</a><a href={`${root}#products`}>Showroom</a><a href={`${root}#visit`}>Visit</a></nav>
    <a className="nav-menu" href={`${root}#visit`}>Enquire <span aria-hidden>↗</span></a>
  </header>;
}
