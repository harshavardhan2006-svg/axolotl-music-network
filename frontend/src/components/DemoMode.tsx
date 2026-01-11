import { AlertCircle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const DemoMode = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
          <Music size={40} className="text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white">
          Axolotl Music Network
        </h1>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle size={20} />
            <span className="font-semibold">Demo Mode</span>
          </div>
          <p className="text-yellow-200 text-sm">
            Backend server is not connected.
          </p>
        </div>
        
        <div className="space-y-4 text-zinc-300">
          <h2 className="text-xl font-semibold text-white">Features:</h2>
          <ul className="text-left space-y-2">
            <li>Music streaming</li>
            <li>Virtual halls</li>
            <li>Real-time chat</li>
            <li>Social features</li>
          </ul>
        </div>
        
        <Button 
          onClick={() => window.open('https://github.com/harshavardhan2006-svg/axolotl-music-network', '_blank')}
          className="bg-green-600 hover:bg-green-500 text-white"
        >
          View Code
        </Button>
      </div>
    </div>
  );
};

export default DemoMode;