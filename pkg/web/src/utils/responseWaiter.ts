export class ResponseWaiter<T> {
  private changeListeners = new Map<string, Array<(value: T) => void>>();
  // isCacheInitializing: boolean = false;

  wait(key: string = 'defaultKey') {
    return new Promise<T>((resolve) => {
      this.changeListeners.set(key, [...(this.changeListeners.get(key) || []), resolve]);
    });
  }

  notifyListeners(data: T, key: string = 'defaultKey') {
    this.changeListeners.get(key)?.forEach((listener) => {
      listener(data);
    });
    this.changeListeners.delete(key);
    // this.isCacheInitializing = true;
  }
}