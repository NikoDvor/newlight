import AdminDashboard from "./AdminDashboard";
import AdminExecutiveDashboard from "./AdminExecutiveDashboard";

/**
 * Merged admin dashboard — composes the existing AdminDashboard and
 * AdminExecutiveDashboard pages into a single view. All data-fetching and
 * sections from both originals are preserved; AdminDashboard's NewLightHero
 * serves as the single header (AdminExecutiveDashboard has no hero).
 */
export default function AdminCombinedDashboard() {
  return (
    <>
      <AdminDashboard />
      <AdminExecutiveDashboard />
    </>
  );
}
