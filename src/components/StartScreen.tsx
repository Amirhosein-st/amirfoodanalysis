import { getAssetUrl } from "@/lib/utils";

// The shared styles in index.html also show this screen before React loads.
const StartScreen = () => (
  <main className="rima-start-screen" aria-label="Rima FT is starting" aria-busy="true">
    <div className="rima-start-brand">
      <img
        className="rima-start-logo"
        src={getAssetUrl("logo.png")}
        alt=""
        width="176"
        height="176"
      />
      <h1 className="rima-start-title">
        Rima FT
        <span className="rima-start-subtitle">Food Tracker</span>
      </h1>
    </div>
    <div className="rima-start-status" role="status" aria-live="polite" aria-label="Loading Rima FT">
      <div className="rima-start-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  </main>
);

export default StartScreen;
