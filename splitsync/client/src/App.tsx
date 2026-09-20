import { Route, Routes } from "react-router-dom";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import AuthenticationPage from "./pages/AuthenticationPage";
import GroupDashboardPage from "./pages/GroupDashboardPage";
import GroupsPage from "./pages/GroupsPage";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<AuthenticationPage />} />
			<Route element={<AuthenticatedLayout />}>
				<Route path="/home" element={<HomePage />} />
				<Route path="/groups" element={<GroupsPage />} />
				<Route path="/groups/:id" element={<GroupDashboardPage />} />
				<Route path="/profile" element={<ProfilePage />} />
			</Route>
		</Routes>
	);
}

export default App;
