import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";

interface ScreenProps {
  children: React.ReactNode;
  /** Passed only by Home, which shows a logout action in the top bar. */
  onLogout?: () => void;
}

export default function Screen({ children, onLogout }: ScreenProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <TopBar onLogout={onLogout} />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[26px] pt-2 pb-32">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
