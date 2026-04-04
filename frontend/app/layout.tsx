import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desk of Finance",
  description: "Modern finance management platform with HRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const whatsappLink = "https://wa.me/94703375873";

  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          title="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-[9999] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_16px_35px_-14px_rgba(37,211,102,0.95)] transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="h-7 w-7"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.11 17.09c-.28-.14-1.64-.81-1.89-.9-.25-.09-.43-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.21-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.63-1.54-1.91-.16-.28-.02-.43.12-.57.13-.13.28-.33.43-.49.14-.16.19-.28.28-.47.09-.18.05-.35-.02-.49-.07-.14-.62-1.5-.85-2.06-.22-.52-.44-.45-.62-.46h-.53c-.18 0-.49.07-.75.35-.26.28-.98.96-.98 2.34 0 1.38 1.01 2.72 1.15 2.91.14.18 1.98 3.03 4.8 4.25.67.29 1.2.46 1.61.59.67.21 1.27.18 1.75.11.53-.08 1.64-.67 1.87-1.32.23-.65.23-1.21.16-1.32-.07-.11-.25-.18-.53-.32z" />
            <path d="M16.01 3.2c-7.05 0-12.78 5.73-12.78 12.78 0 2.25.59 4.44 1.72 6.36L3.2 28.8l6.61-1.73a12.74 12.74 0 0 0 6.2 1.6c7.05 0 12.79-5.74 12.79-12.79S23.06 3.2 16.01 3.2zm0 23.39c-1.96 0-3.89-.53-5.58-1.53l-.4-.24-3.92 1.03 1.05-3.82-.26-.39a10.7 10.7 0 0 1-1.64-5.76c0-5.91 4.81-10.72 10.72-10.72s10.72 4.81 10.72 10.72-4.81 10.71-10.72 10.71z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
