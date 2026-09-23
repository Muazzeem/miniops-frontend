import {createContext,useContext,useState,type ReactNode} from 'react';
import {projects as seed, type Project} from '@/data/mock';
type Store={projects:Project[];addProject:(p:Project)=>void;notifications:number;markRead:()=>void};
const C=createContext<Store|null>(null);
export function MiniOpsProvider({children}:{children:ReactNode}){const [projects,setProjects]=useState(seed);const [notifications,setNotifications]=useState(3);return <C.Provider value={{projects,addProject:p=>setProjects(x=>[p,...x]),notifications,markRead:()=>setNotifications(0)}}>{children}</C.Provider>}
export function useMiniOps(){const c=useContext(C);if(!c)throw new Error('MiniOpsProvider missing');return c}
