import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import FriendsActivity from "./components/FriendsActivity";
import { PlaybackControls } from "./components/PlaybackControls";
import { useState } from "react";

const MainLayout = () => {
  const [isLeftExpanded, setIsLeftExpanded] = useState(false);
  const [isRightExpanded, setIsRightExpanded] = useState(false);

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Main Content Area - Full Screen Canvas behind floating elements */}
      <main 
        className="absolute inset-y-0 pt-4 pb-24 overflow-hidden transition-all duration-500 ease-out"
        style={{
            left: isLeftExpanded ? "320px" : "96px",
            right: isRightExpanded ? "368px" : "24px",
        }}
      >
         <Outlet />
      </main>

      {/* Floating Navigation Dock (Left) - Expands on Hover - Full Height */}
      <div 
        className="absolute left-4 top-4 bottom-4 w-16 hover:w-64 transition-all duration-500 ease-out z-30 flex flex-col justify-center group"
        onMouseEnter={() => setIsLeftExpanded(true)}
        onMouseLeave={() => setIsLeftExpanded(false)}
      >
        <div className="h-full w-full">
          <LeftSidebar />
        </div>
      </div>

      {/* Floating Friends Drawer (Right) - Slides out from edge */}
      <div 
        className="absolute right-0 top-4 bottom-20 w-2 hover:w-80 transition-all duration-500 ease-out z-20 group translate-x-[calc(100%-8px)] hover:translate-x-0"
        onMouseEnter={() => setIsRightExpanded(true)}
        onMouseLeave={() => setIsRightExpanded(false)}
      >
         <div className="h-full w-full glass rounded-l-2xl overflow-hidden opacity-90">
            <FriendsActivity />
         </div>
      </div>

      {/* Floating Capsule Player (Bottom Right) - Beside Sidebar */}
      <div 
        className="absolute bottom-4 z-40 transition-all duration-500 ease-out"
        style={{
            left: isLeftExpanded ? "320px" : "96px",
            right: isRightExpanded ? "368px" : "24px",
        }}
      >
        <PlaybackControls />
      </div>
    </div>
  );
};
export default MainLayout;
