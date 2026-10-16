import Image from "next/image";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" aria-label="Ready2Work – Trang chủ" className={`inline-flex shrink-0 items-center gap-2.5 text-xl font-extrabold tracking-tight ${inverse ? "text-white" : "text-foreground"}`}>
      <Image src="/theme/logo.png" alt="" width={42} height={39} className="h-10 w-11 object-contain" />
      <span>Ready<span className={inverse ? "text-[#56e1d5]" : "text-primary"}>2</span>Work</span>
    </Link>
  );
}
