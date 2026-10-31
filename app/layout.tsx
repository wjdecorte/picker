import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'NFL Picks Dashboard',description:'Weekly selections, honest results, and a clearer edge.',icons:{icon:[{url:'/favicon.svg?v=2',type:'image/svg+xml'}],shortcut:'/favicon.svg?v=2'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
