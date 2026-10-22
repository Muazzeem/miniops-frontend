import {createFileRoute,Outlet,useLocation,useNavigate} from '@tanstack/react-router';import {useEffect} from 'react';import {AppShell} from '@/components/miniops/core';import {PageLoader,useSessionLoading} from '@/components/miniops/page-loader';import {useMiniOps} from '@/features/store';
export const Route=createFileRoute('/_workspace')({component:WorkspaceLayout});
/** The employee page that matches an employer page (employees only get the employee view). */
function employeePath(path:string){const [,section,slug]=path.split('/');if(section==='projects'&&slug)return `/employee/projects/${slug}`;const map:Record<string,string>={projects:'/employee/projects',tasks:'/employee/tasks',time:'/employee/time',team:'/employee/team',chat:'/employee/chat',activity:'/employee/activity',notifications:'/employee/notifications',profile:'/employee/profile',settings:'/employee/settings'};return map[section??'']??'/employee'}
function WorkspaceLayout(){const {employeeOnly}=useMiniOps();const sessionLoading=useSessionLoading();const {pathname}=useLocation();const navigate=useNavigate();
// This layout can render once more while the redirect is in flight (with the new
// /employee/... path); only redirect from employer pages, or it would loop.
const target=employeeOnly&&!pathname.startsWith('/employee')?employeePath(pathname):null;
useEffect(()=>{if(target)void navigate({to:target as never,replace:true})},[target,navigate]);
// Wait for the role before showing anything, so employees never see the employer view flash.
if(sessionLoading||employeeOnly)return <PageLoader/>;
return <AppShell><Outlet/></AppShell>}
