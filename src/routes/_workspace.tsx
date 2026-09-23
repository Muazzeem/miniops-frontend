import {createFileRoute,Outlet} from '@tanstack/react-router';import {AppShell} from '@/components/miniops/core';
export const Route=createFileRoute('/_workspace')({component:()=> <AppShell><Outlet/></AppShell>});
