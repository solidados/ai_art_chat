import { ReactNode } from "react";
import "./global.css";

interface ILayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: "AI Art Chat",
  description:
    "A lightweight AI chatbot that fetches artwork details from the Mia Collection dataset. Built with Next.js, TypeScript, and Node.js, it lets users ask natural language questions about artists, styles, and artworks.",
};

const RouteLayout = ({ children }: ILayoutProps) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RouteLayout;
