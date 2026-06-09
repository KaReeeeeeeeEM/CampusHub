import { apiClient } from "@/lib/api/client";

export abstract class BaseService {
  protected get<T>(path: string) {
    return apiClient.get<T>(path);
  }

  protected post<T>(path: string, body?: unknown) {
    return apiClient.post<T>(path, body);
  }

  protected put<T>(path: string, body?: unknown) {
    return apiClient.put<T>(path, body);
  }

  protected delete<T>(path: string) {
    return apiClient.delete<T>(path);
  }
}
