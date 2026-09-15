import { Component } from "react";
import PropTypes from "prop-types";

// A React error boundary MUST be a class component - there is no Hooks
// equivalent for componentDidCatch/getDerivedStateFromError as of React 19.
// This is deliberately narrow in scope: it wraps just the current mode's
// render output (see App.jsx), not the whole app shell. Before this
// existed, ANY render error anywhere - one broken card, a bad translation
// response, whatever - fell through to index.html's page-level
// window.onerror handler and blanked the ENTIRE app to a generic "Etwas
// ist schiefgelaufen" screen, including the topic tabs, search, and mode
// switcher needed to even navigate away from the problem. This boundary
// catches the error one level up instead: the broken mode shows a
// recoverable fallback, while the rest of the app (tabs, search, mode
// switcher) stays intact and clickable.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught an error in", this.props.label || "a mode", ":", error, info);
  }

  componentDidUpdate(prevProps) {
    // If the person switches away from the broken mode and back, or the
    // resetKey otherwise changes, give the subtree a fresh try rather than
    // permanently pinning it to the fallback for the rest of the session.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Dieser Bereich hat ein Problem</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Versuche ein anderes Thema oder einen anderen Modus - der Rest der App funktioniert weiter.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  resetKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
};

export default ErrorBoundary;
