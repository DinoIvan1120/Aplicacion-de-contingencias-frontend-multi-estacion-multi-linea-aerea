import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { AgenteAtencionProvider } from "../../context/AgenteAtencionContext.jsx";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AgenteAtencionProvider>
      <div className={styles.layout}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </AgenteAtencionProvider>
  );
}

// export default function AppLayout() {
//   const [sidebarOpen, setSidebarOpen] = useState(false)

//   return (
//     <div className={styles.layout}>
//       <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
//       <Topbar onMenuClick={() => setSidebarOpen(true)} />
//       <main className={styles.main}>
//         <Outlet />
//       </main>
//     </div>
//   )
// }
