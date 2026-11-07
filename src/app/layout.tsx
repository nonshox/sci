import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'SCI — Source Intelligence',description:'Connect sources and review collected content.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
