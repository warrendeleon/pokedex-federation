// --- listApp container entry. A federated remote has no AppRegistry registration; this file
// runs when the host initialises the container. Importing global.css processes this bundle's
// NativeWind/Tailwind CSS so the remote's classNames resolve (merged at runtime with the
// host's via the shared cssInterop singleton). ---
import '../global.css';
