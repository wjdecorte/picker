import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'NFL Picks Dashboard',description:'Weekly selections, honest results, and a clearer edge.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
