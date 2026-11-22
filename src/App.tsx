import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppShell, RequireAuth, WorkspaceLayout } from '@/components/layouts';
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import CreateReunion from '@/pages/CreateReunion';
import Profile from '@/pages/Profile';
import Join from '@/pages/Join';
import Overview from '@/pages/workspace/Overview';
import Invite from '@/pages/workspace/Invite';
import Dates from '@/pages/workspace/Dates';
import Venues from '@/pages/workspace/Venues';
import Food from '@/pages/workspace/Food';
import Budget from '@/pages/workspace/Budget';
import Payments from '@/pages/workspace/Payments';
import Tasks from '@/pages/workspace/Tasks';
import Members from '@/pages/workspace/Members';
import EventDay from '@/pages/workspace/EventDay';
import Memories from '@/pages/workspace/Memories';
import Vendor from '@/pages/Vendor';
import Admin from '@/pages/Admin';
import Credits from '@/pages/Credits';
import NotFound from '@/pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/join/:token" element={<Join />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/vendor" element={<Vendor />} />
        <Route path="/admin" element={<Admin />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/new" element={<CreateReunion />} />
          <Route path="/app/profile" element={<Profile />} />
        </Route>
        <Route path="/r/:id" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="invite" element={<Invite />} />
          <Route path="dates" element={<Dates />} />
          <Route path="venues" element={<Venues />} />
          <Route path="food" element={<Food />} />
          <Route path="budget" element={<Budget />} />
          <Route path="payments" element={<Payments />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="members" element={<Members />} />
          <Route path="event" element={<EventDay />} />
          <Route path="memories" element={<Memories />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
