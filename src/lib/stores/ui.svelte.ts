// Cross-component UI signals that don't belong to any domain store.
// (Pattern ported from Compass v2 — the template inherits its improvements.)

// True while the ComfortBar's expanded panel is open. The Sidebar watches it
// and closes itself — the vessel opened the panel, they want to see it.
let comfortBarExpanded = $state(false);

export const uiStore = {
	get comfortBarExpanded() { return comfortBarExpanded; },
	setComfortBarExpanded(value: boolean) { comfortBarExpanded = value; },
};
