import { Route, Routes } from "react-router-dom";
import AuthenticationPage from "./pages/AuthenticationPage";
import GroupsPage from "./pages/GroupsPage";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<AuthenticationPage />} />
			<Route path="/home" element={<HomePage />} />
			<Route path="/groups" element={<GroupsPage />} />
			<Route path="/profile" element={<ProfilePage />} />
		</Routes>
	);
}

export default App;
