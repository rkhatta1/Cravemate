import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Cravemate",
  description: "Group chat for foodies",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
