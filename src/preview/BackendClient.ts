export class BackendClient {
  constructor(private baseUrl: string = "https://api.example.com") {}

  async fetchData(context: any): Promise<any> {
    try {
      // Example: simulate backend call
      // In real world: use `fetch` or axios
      return {
        title: "Preview for " + context.fileName,
        description: `Detected context: ${JSON.stringify(context, null, 2)}`,
        timestamp: new Date().toLocaleString(),
      };
    } catch (err) {
      console.error("BackendClient.fetchData failed", err);
      return { title: "Error", description: String(err) };
    }
  }
}
