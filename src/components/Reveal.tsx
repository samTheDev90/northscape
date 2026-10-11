import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  /** Delay in seconds, before the animation fires once visible. */
  delay?: number;
  /** How far the element travels (in px). */
  distance?: number;
  /** Extra classes. */
  className?: string;
  /** Optional: fraction of the element that must be visible. Default 0.15. */
  threshold?: number;
}

export default function Reveal({
  children,
  delay = 0,
  distance = 20,
  className = "",
  threshold = 0.15,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If the browser doesn't support IntersectionObserver, just reveal it.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const style: React.CSSProperties = visible
    ? {
        opacity: 1,
        transform: "translateY(0)",
        transition: `opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }
    : {
        opacity: 0,
        transform: `translateY(${distance}px)`,
        transition: `opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
