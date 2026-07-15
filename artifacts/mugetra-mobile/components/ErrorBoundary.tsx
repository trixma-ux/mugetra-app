import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[MUGETRA] Erreur non interceptée :", error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>{this.state.error?.message ?? "Erreur inattendue."}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#f5f7f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  message: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  button: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: "#1a5c3a" },
  buttonText: { color: "#ffffff", fontWeight: "600" },
});
