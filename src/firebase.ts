// Mock Firebase implementation for local-only mode
// This ensures the app remains functional in the preview after declining Firebase setup.

const mockUser = {
  uid: 'local-user-123',
  email: 'local@example.com',
  displayName: 'Local User',
  photoURL: 'https://picsum.photos/seed/user/200/200',
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  tenantId: null,
};

class MockAuth {
  currentUser = null;
  onAuthStateChanged(callback: any) {
    // Simulate a slight delay for auth readiness
    setTimeout(() => {
      // For demo purposes, we can either be logged in or out.
      // Let's default to logged out but allow manual login.
      callback(this.currentUser);
    }, 500);
    return () => {};
  }
}

class MockFirestore {
  private data: Record<string, any> = JSON.parse(localStorage.getItem('mock_firestore') || '{}');

  private save() {
    localStorage.setItem('mock_firestore', JSON.stringify(this.data));
  }

  collection(_db: any, path: string) {
    return { path };
  }

  doc(_db: any, path: string, id?: string) {
    return { path: id ? `${path}/${id}` : path, id };
  }

  async getDoc(docRef: any) {
    const [collection, id] = docRef.path.split('/');
    const docData = this.data[collection]?.[id];
    return {
      exists: () => !!docData,
      data: () => docData,
      id
    };
  }

  async setDoc(docRef: any, data: any, options?: any) {
    const [collection, id] = docRef.path.split('/');
    if (!this.data[collection]) this.data[collection] = {};
    if (options?.merge) {
      this.data[collection][id] = { ...this.data[collection][id], ...data };
    } else {
      this.data[collection][id] = data;
    }
    this.save();
  }

  async addDoc(colRef: any, data: any) {
    const id = Math.random().toString(36).substring(7);
    const collection = colRef.path;
    if (!this.data[collection]) this.data[collection] = {};
    this.data[collection][id] = data;
    this.save();
    return { id };
  }

  async deleteDoc(docRef: any) {
    const [collection, id] = docRef.path.split('/');
    if (this.data[collection]) {
      delete this.data[collection][id];
      this.save();
    }
  }

  onSnapshot(query: any, callback: any) {
    const collection = query.path || query.collectionPath;
    const filter = query.filter;
    
    const emit = () => {
      const docs = Object.entries(this.data[collection] || {}).map(([id, data]: [string, any]) => ({
        id,
        data: () => data,
        ...data
      }));
      
      const filteredDocs = filter ? docs.filter(d => filter(d)) : docs;
      callback({ docs: filteredDocs });
    };

    emit();
    // In a real mock we'd listen for changes, but for now we'll just emit once or on a timer
    const interval = setInterval(emit, 2000);
    return () => clearInterval(interval);
  }

  query(colRef: any, ...constraints: any[]) {
    let filter = null;
    constraints.forEach(c => {
      if (c.type === 'where') {
        filter = (doc: any) => {
          const data = doc.data();
          return data[c.field] === c.value;
        };
      }
    });
    return { collectionPath: colRef.path, filter };
  }
}

export const auth: any = new MockAuth();
export const db: any = new MockFirestore();

// Helper for where clause in mock
export const where = (field: string, op: string, value: any) => ({ type: 'where', field, op, value });
export const serverTimestamp = () => new Date().toISOString();

// Mock Auth functions
export const onAuthStateChanged = (authInstance: any, callback: any) => authInstance.onAuthStateChanged(callback);
export const signInWithPopup = async (authInstance: any, _provider: any) => {
  authInstance.currentUser = mockUser;
  return { user: mockUser };
};
export const signOut = async (authInstance: any) => {
  authInstance.currentUser = null;
};
export const GoogleAuthProvider = class {};

// Mock Firestore functions
export const collection = (dbInstance: any, path: string) => dbInstance.collection(dbInstance, path);
export const doc = (dbInstance: any, path: string, id?: string) => dbInstance.doc(dbInstance, path, id);
export const getDoc = (docRef: any) => db.getDoc(docRef);
export const setDoc = (docRef: any, data: any, options?: any) => db.setDoc(docRef, data, options);
export const addDoc = (colRef: any, data: any) => db.addDoc(colRef, data);
export const deleteDoc = (docRef: any) => db.deleteDoc(docRef);
export const onSnapshot = (query: any, callback: any) => db.onSnapshot(query, callback);
export const query = (colRef: any, ...constraints: any[]) => db.query(colRef, ...constraints);
