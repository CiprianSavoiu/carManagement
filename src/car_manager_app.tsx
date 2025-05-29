import React, { useState, useEffect } from 'react';
import { Car, Calendar, Fuel, Wrench, Bell, Plus, Edit3, Trash2, Loader2, LogOut, User } from 'lucide-react';


// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';


// --- New AuthScreen Component ---
const AuthScreen = ({ onSignIn, authError, isLoadingAuth }) => {
 return (
   <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
     <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
       <Car className="text-blue-500 mx-auto mb-4" size={48} />
       <h2 className="text-2xl font-semibold mb-6">Car Manager</h2>
       <p className="text-gray-600 mb-6">Sign in to manage your vehicle data across all your devices.</p>
      
       {authError && (
         <p className="text-red-500 text-sm mb-4">{authError}</p>
       )}


       <button
         onClick={onSignIn}
         className="bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center gap-3 w-full hover:bg-blue-700 transition-colors"
         disabled={isLoadingAuth}
       >
         {isLoadingAuth ? (
           <Loader2 className="animate-spin" size={20} />
         ) : (
           <>
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="h-5 w-5" />
             Sign in with Google
           </>
         )}
       </button>
     </div>
   </div>
 );
};
// --- End AuthScreen Component ---




const CarManagerApp = () => {
 const [cars, setCars] = useState([]);
 const [fuelRecords, setFuelRecords] = useState([]);
 const [maintenanceRecords, setMaintenanceRecords] = useState([]);
 const [activeTab, setActiveTab] = useState('cars');
 const [showAddCar, setShowAddCar] = useState(false);
 const [showAddRecord, setShowAddRecord] = useState(false);
 const [editingCar, setEditingCar] = useState(null);
 const [editingFuelRecord, setEditingFuelRecord] = useState(null);
 const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState(null);
 const [filterCarId, setFilterCarId] = useState('');
 const [notifications, setNotifications] = useState([]);
 const [showConfirmDelete, setShowConfirmDelete] = useState(false);
 const [carToDelete, setCarToDelete] = useState(null);
 const [maintenanceView, setMaintenanceView] = useState('all');

// Use the actual Firebase project ID here
 const appId = 'carmanagement-3fadc';  

 // Firebase states
 const [db, setDb] = useState(null);
 const [auth, setAuth] = useState(null);
 const [userId, setUserId] = useState(null);
 const [isAuthReady, setIsAuthReady] = useState(false);
 const [isLoadingCars, setIsLoadingCars] = useState(true);
 const [isLoadingFuelRecords, setIsLoadingFuelRecords] = useState(true);
 const [isLoadingMaintenanceRecords, setIsLoadingMaintenanceRecords] = useState(true);
 const [authError, setAuthError] = useState(null); // New state for auth errors
 const [isLoadingAuth, setIsLoadingAuth] = useState(false); // New state for auth loading


 // Initialize Firebase and authenticate
 useEffect(() => {
   try {
     
     // Use the actual Firebase config object here
     const firebaseConfig = {
       apiKey: "AIzaSyBFJdjrhfQocX5zOCMCCUxRv5FJk4e0CxA",
       authDomain: "carmanagement-3fadc.firebaseapp.com",
       projectId: "carmanagement-3fadc",
       storageBucket: "carmanagement-3fadc.firebasestorage.app",
       messagingSenderId: "393991063519",
       appId: "1:393991063519:web:bb015c0487e16cd4be266a"
     };
    


     if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
       console.error("Firebase config is missing. Please ensure __firebase_config is provided.");
       return;
     }


     const app = initializeApp(firebaseConfig);
     const firestoreDb = getFirestore(app);
     const firebaseAuth = getAuth(app);


     setDb(firestoreDb);
     setAuth(firebaseAuth);


     const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
       if (user) {
         setUserId(user.uid);
         setAuthError(null); // Clear any previous auth errors on successful sign-in
       } else {
         setUserId(null); // No user is signed in
       }
       setIsAuthReady(true); // Auth state is ready
       setIsLoadingAuth(false); // Auth loading is complete
     });


     return () => unsubscribe(); // Cleanup auth listener
   } catch (error) {
     console.error("Failed to initialize Firebase:", error);
     setAuthError("Failed to initialize app. Please check your internet connection.");
     setIsAuthReady(true); // Still set ready to display auth screen
     setIsLoadingAuth(false);
   }
 }, []); // Run once on component mount


 // Google Sign-in Handler
 const handleGoogleSignIn = async () => {
   if (!auth) {
     setAuthError("Authentication service not initialized.");
     return;
   }
   setIsLoadingAuth(true);
   setAuthError(null);
   const provider = new GoogleAuthProvider();
   try {
     await signInWithPopup(auth, provider);
     // onAuthStateChanged listener will handle setting userId
   } catch (error) {
     console.error("Error during Google sign-in:", error.code, error.message);
     if (error.code === 'auth/popup-closed-by-user') {
       setAuthError('Sign-in cancelled by user.');
     } else if (error.code === 'auth/network-request-failed') {
       setAuthError('Network error. Please check your internet connection.');
     } else {
       setAuthError('Sign-in failed. Please try again.');
     }
     setIsLoadingAuth(false);
   }
 };


 // Logout Handler
 const handleLogout = async () => {
   if (!auth) return;
   try {
     await signOut(auth);
     // onAuthStateChanged will set userId to null, triggering AuthScreen
     // Reset data to empty arrays when logging out
     setCars([]);
     setFuelRecords([]);
     setMaintenanceRecords([]);
     setNotifications([]);
     setFilterCarId('');
     setActiveTab('cars');
   } catch (error) {
     console.error("Error signing out:", error);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to log out. Please try again.");
   }
 };




 // Fetch cars when auth is ready and db/userId are available
 useEffect(() => {
   if (db && userId && isAuthReady) {
     const carsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/cars`);
     const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
       const fetchedCars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setCars(fetchedCars);
       checkNotifications(fetchedCars);
       setIsLoadingCars(false);
     }, (error) => {
       console.error("Error fetching cars:", error);
       setIsLoadingCars(false);
     });
     return () => unsubscribe();
   } else if (isAuthReady && !userId) {
     // If auth is ready but no userId, clear data and stop loading indicators
     setCars([]);
     setIsLoadingCars(false);
   }
 }, [db, userId, isAuthReady]);


 // Fetch fuel records when auth is ready and db/userId are available
 useEffect(() => {
   if (db && userId && isAuthReady) {
     const fuelRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/fuelRecords`);
     const unsubscribe = onSnapshot(fuelRecordsCollectionRef, (snapshot) => {
       const fetchedFuelRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setFuelRecords(fetchedFuelRecords);
       setIsLoadingFuelRecords(false);
     }, (error) => {
       console.error("Error fetching fuel records:", error);
       setIsLoadingFuelRecords(false);
     });
     return () => unsubscribe();
   } else if (isAuthReady && !userId) {
     setFuelRecords([]);
     setIsLoadingFuelRecords(false);
   }
 }, [db, userId, isAuthReady]);


 // Fetch maintenance records when auth is ready and db/userId are available
 useEffect(() => {
   if (db && userId && isAuthReady) {
     const maintenanceRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`);
     const unsubscribe = onSnapshot(maintenanceRecordsCollectionRef, (snapshot) => {
       const fetchedMaintenanceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setMaintenanceRecords(fetchedMaintenanceRecords);
       setIsLoadingMaintenanceRecords(false);
     }, (error) => {
       console.error("Error fetching maintenance records:", error);
       setIsLoadingMaintenanceRecords(false);
     });
     return () => unsubscribe();
   } else if (isAuthReady && !userId) {
     setMaintenanceRecords([]);
     setIsLoadingMaintenanceRecords(false);
   }
 }, [db, userId, isAuthReady]);


 // Re-check notifications whenever cars, fuel, or maintenance records change
 useEffect(() => {
   if (!isLoadingCars && !isLoadingFuelRecords && !isLoadingMaintenanceRecords) {
     checkNotifications(cars);
   }
 }, [cars, fuelRecords, maintenanceRecords, isLoadingCars, isLoadingFuelRecords, isLoadingMaintenanceRecords]);


 const checkNotifications = (carsList) => {
   const today = new Date();
   const upcomingExpiries = [];
  
   carsList.forEach(car => {
     const insuranceDate = new Date(car.insuranceExpiry);
     const taxDate = new Date(car.taxExpiry);
     const roadTaxDate = new Date(car.roadTaxExpiry);
     const motDate = new Date(car.motExpiry);
    
     const checkAndAdd = (date, type) => {
       const daysLeft = Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       if (daysLeft <= 30) {
         upcomingExpiries.push({
           car: car.name,
           type: type,
           date: date,
           daysLeft: daysLeft,
           status: daysLeft <= 0 ? 'expired' : (daysLeft <= 10 ? 'upcoming-10' : 'upcoming-30')
         });
       }
     };


     checkAndAdd(car.insuranceExpiry, 'Insurance');
     checkAndAdd(car.taxExpiry, 'Tax');
     checkAndAdd(car.roadTaxExpiry, 'Road Tax');
     checkAndAdd(car.motExpiry, 'MOT');


     // Check for planned maintenance as notifications
     maintenanceRecords.filter(rec => rec.carId === car.id && rec.isPlanned).forEach(rec => {
       const serviceDate = new Date(rec.date);
       const serviceDaysLeft = Math.ceil((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
       if (serviceDaysLeft <= 30) {
         upcomingExpiries.push({
           car: car.name,
           type: `Planned Service: ${rec.type}`,
           date: rec.date,
           daysLeft: serviceDaysLeft,
           status: serviceDaysLeft <= 0 ? 'expired' : (serviceDaysLeft <= 10 ? 'upcoming-10' : 'upcoming-30')
         });
       }
     });
   });
  
   upcomingExpiries.sort((a, b) => a.daysLeft - b.daysLeft);
   setNotifications(upcomingExpiries);
 };


 const addCar = async (carData) => {
   if (!db || !userId) return;
   try {
     const carsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/cars`);
     await addDoc(carsCollectionRef, carData);
     setShowAddCar(false);
   } catch (e) {
     console.error("Error adding car: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to add car. Please try again.");
   }
 };


//  const deleteCar = async (carId) => {
//    if (!db || !userId) return;
//    try {
//      // Delete car document
//      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/cars`, carId));


//      // Delete associated fuel records (Firestore queries return docs, not just IDs)
//      const fuelRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/fuelRecords`), where("carId", "==", parseInt(carId)));
//      const fuelRecordsSnapshot = await getDocs(fuelRecordsQuery);
//      fuelRecordsSnapshot.forEach(async (recordDoc) => {
//        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/fuelRecords`, recordDoc.id));
//      });


//      // Delete associated maintenance records
//      const maintenanceRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`), where("carId", "==", parseInt(carId)));
//      const maintenanceRecordsSnapshot = await getDocs(maintenanceRecordsQuery);
//      maintenanceRecordsSnapshot.forEach(async (recordDoc) => {
//        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`, recordDoc.id));
//      });


//      setShowConfirmDelete(false);
//      setCarToDelete(null);
//    } catch (e) {
//      console.error("Error deleting car and associated records: ", e);
//      // Using a custom modal/message box instead of alert()
//      console.log("Failed to delete car and its records. Please try again.");
//    }
//  };
const deleteCar = async (carId) => { // carId is the STRING ID of the car document
  if (!db || !userId) return;
  try {
    // Delete car document
    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/cars`, carId));

    // Delete associated fuel records
    // IMPORTANT: Ensure 'carId' field in fuelRecords matches the car document ID (string)
    // Remove parseInt - the 'carId' field in fuel records should be a string matching the car's document ID
    const fuelRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/fuelRecords`), where("carId", "==", carId)); // <--- CHANGED
    const fuelRecordsSnapshot = await getDocs(fuelRecordsQuery);
    fuelRecordsSnapshot.forEach(async (recordDoc) => {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/fuelRecords`, recordDoc.id));
    });

    // Delete associated maintenance records
    // Remove parseInt - the 'carId' field in maintenance records should be a string matching the car's document ID
    const maintenanceRecordsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`), where("carId", "==", carId)); // <--- CHANGED
    const maintenanceRecordsSnapshot = await getDocs(maintenanceRecordsQuery);
    maintenanceRecordsSnapshot.forEach(async (recordDoc) => {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`, recordDoc.id));
    });

    setShowConfirmDelete(false);
    setCarToDelete(null);
  } catch (e) {
    console.error("Error deleting car and associated records: ", e);
    // Using a custom modal/message box instead of alert()
    console.log("Failed to delete car and its records. Please try again.");
  }
};



 const addFuelRecord = async (recordData, carId) => {
   if (!db || !userId) return;
   try {
     const fuelRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/fuelRecords`);
     await addDoc(fuelRecordsCollectionRef, { ...recordData, carId: carId });


     // Update car mileage if this is the highest mileage fuel record for this car
     const carRef = doc(db, `artifacts/${appId}/users/${userId}/cars`, String(carId));
     const carDoc = await getDoc(carRef);
     if (carDoc.exists()) {
       const currentMileage = carDoc.data().mileage || 0;
       if (recordData.mileage > currentMileage) {
         await updateDoc(carRef, { mileage: recordData.mileage });
       }
     }
     setShowAddRecord(false);
   } catch (e) {
     console.error("Error adding fuel record: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to add fuel record. Please try again.");
   }
 };


 const editFuelRecord = async (recordData, carId) => {
   if (!db || !userId || !editingFuelRecord) return;
   try {
     await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/fuelRecords`, editingFuelRecord.id), { ...recordData, carId: carId });


     // Re-evaluate car mileage after editing a fuel record
     const carRef = doc(db, `artifacts/${appId}/users/${userId}/cars`, String(carId));
     const fuelRecordsForCar = (await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/fuelRecords`), where("carId", "==", carId)))).docs.map(d => d.data());
    
     let maxMileage = 0;
     if (fuelRecordsForCar.length > 0) {
       maxMileage = Math.max(...fuelRecordsForCar.map(r => r.mileage));
     } else {
       // If no fuel records, set mileage to 0 or initial car mileage if known
       // For simplicity, we'll set to 0 if no fuel records contribute to mileage.
       // A more complex app might revert to the car's initial mileage on creation.
       maxMileage = 0;
     }


     const carDoc = await getDoc(carRef);
     if (carDoc.exists() && carDoc.data().mileage !== maxMileage) {
        await updateDoc(carRef, { mileage: maxMileage });
     }
     setEditingFuelRecord(null);
   } catch (e) {
     console.error("Error editing fuel record: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to update fuel record. Please try again.");
   }
 };


 const addMaintenanceRecord = async (recordData, carId) => {
   if (!db || !userId) return;
   try {
     const maintenanceRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`);
     await addDoc(maintenanceRecordsCollectionRef, { ...recordData, carId: carId, isPlanned: new Date(recordData.date).getTime() > new Date().getTime() });
     setShowAddRecord(false);
   } catch (e) {
     console.error("Error adding maintenance record: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to add maintenance record. Please try again.");
   }
 };
// const addMaintenanceRecord = async (recordData, carId) => { // carId is now expected to be a string
//   if (!db || !userId) return;
//   try {
//     const maintenanceRecordsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`);
//     await addDoc(maintenanceRecordsCollectionRef, { ...recordData, carId: carId, isPlanned: new Date(recordData.date).getTime() > new Date().getTime() }); // Store carId as string
//     setShowAddRecord(false);
//   } catch (e) {
//     console.error("Error adding maintenance record: ", e);
//     console.log("Failed to add maintenance record. Please try again.");
//   }
// };



 const editMaintenanceRecord = async (recordData, carId) => {
   if (!db || !userId || !editingMaintenanceRecord) return;
   try {
     await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/maintenanceRecords`, editingMaintenanceRecord.id), { ...recordData, carId: carId, isPlanned: new Date(recordData.date).getTime() > new Date().getTime() });
     setEditingMaintenanceRecord(null);
   } catch (e) {
     console.error("Error editing maintenance record: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to update maintenance record. Please try again.");
   }
 };


 const editCar = async (carData) => {
   if (!db || !userId || !editingCar) return;
   try {
     await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/cars`, editingCar.id), carData);
     setEditingCar(null);
   } catch (e) {
     console.error("Error editing car: ", e);
     // Using a custom modal/message box instead of alert()
     console.log("Failed to update car. Please try again.");
   }
 };


 const CarForm = ({ onSubmit, onCancel, initialData = null }) => {
   const [formData, setFormData] = useState(initialData || {
     name: '',
     year: '',
     color: '',
     mileage: '',
     insuranceExpiry: '',
     taxExpiry: '',
     roadTaxExpiry: '',
     motExpiry: '',
     photo: null
   });


   // Function to resize and compress image
   const processImage = (file, maxWidth, maxHeight, quality) => {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (event) => {
         const img = new Image();
         img.src = event.target.result;
         img.onload = () => {
           const canvas = document.createElement('canvas');
           let width = img.width;
           let height = img.height;


           // Calculate new dimensions while maintaining aspect ratio
           if (width > height) {
             if (width > maxWidth) {
               height *= maxWidth / width;
               width = maxWidth;
             }
           } else {
             if (height > maxHeight) {
               width *= maxHeight / height;
               height = maxHeight;
             }
           }
           canvas.width = width;
           canvas.height = height;


           const ctx = canvas.getContext('2d');
           if (!ctx) {
               reject(new Error("Could not get 2D context for canvas"));
               return;
           }
           ctx.drawImage(img, 0, 0, width, height);


           // Compress image and get data URL
           resolve(canvas.toDataURL('image/jpeg', quality));
         };
         img.onerror = (error) => {
           reject(error);
         };
       };
       reader.onerror = (error) => {
         reject(error);
       };
       reader.readAsDataURL(file);
     });
   };


   const handleSubmit = () => {
     if (!formData.name || !formData.year || formData.mileage === '' || !formData.insuranceExpiry || !formData.taxExpiry || !formData.roadTaxExpiry || !formData.motExpiry) {
       // Using a custom modal/message box instead of alert()
       console.log("Please fill in all required fields.");
       return;
     }
     onSubmit(formData);
   };


   const handlePhotoChange = async (e) => {
     const file = e.target.files[0];
     if (file) {
       try {
         // Process image: max width 800px, max height 600px, quality 0.7 (70%)
         const processedPhoto = await processImage(file, 1200, 900, 0.85);
         setFormData({...formData, photo: processedPhoto});
       } catch (error) {
         console.error("Error processing image:", error);
         // Using a custom modal/message box instead of alert()
         console.log("Failed to process image. Please try a different file or a smaller image.");
         setFormData({...formData, photo: null}); // Clear photo if processing fails
       }
     }
   };


   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
       <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
         <h3 className="text-lg font-semibold mb-4">{initialData ? 'Edit Car' : 'Add New Car'}</h3>
         <div className="space-y-4">
           {formData.photo && (
             <div className="text-center w-full">
               <img src={formData.photo} alt="Car" className="w-full h-48 object-cover rounded" />
             </div>
           )}
           <div>
             <label className="block text-sm text-gray-600 mb-1">Car Photo</label>
             <input
               type="file"
               accept="image/*"
               onChange={handlePhotoChange}
               className="w-full p-2 border rounded"
             />
           </div>
           <input
             type="text"
             placeholder="Car Name (e.g., Honda Civic)"
             value={formData.name}
             onChange={(e) => setFormData({...formData, name: e.target.value})}
             className="w-full p-2 border rounded"
             required
           />
           <input
             type="number"
             placeholder="Year"
             value={formData.year}
             onChange={(e) => setFormData({...formData, year: e.target.value})}
             className="w-full p-2 border rounded"
             required
           />
           <input
             type="text"
             placeholder="Color"
             value={formData.color}
             onChange={(e) => setFormData({...formData, color: e.target.value})}
             className="w-full p-2 border rounded"
           />
           <input
             type="number"
             placeholder="Current Mileage"
             value={formData.mileage}
             onChange={(e) => setFormData({...formData, mileage: e.target.value === '' ? '' : e.target.value})}
             className="w-full p-2 border rounded"
             required
           />
           <div>
             <label className="block text-sm text-gray-600 mb-1">Insurance Expiry</label>
             <input
               type="date"
               value={formData.insuranceExpiry}
               onChange={(e) => setFormData({...formData, insuranceExpiry: e.target.value})}
               className="w-full p-2 border rounded"
               required
             />
           </div>
           <div>
             <label className="block text-sm text-gray-600 mb-1">Tax Expiry</label>
             <input
               type="date"
               value={formData.taxExpiry}
               onChange={(e) => setFormData({...formData, taxExpiry: e.target.value})}
               className="w-full p-2 border rounded"
               required
             />
           </div>
           <div>
             <label className="block text-sm text-gray-600 mb-1">Road Tax Expiry</label>
             <input
               type="date"
               value={formData.roadTaxExpiry}
               onChange={(e) => setFormData({...formData, roadTaxExpiry: e.target.value})}
               className="w-full p-2 border rounded"
               required
             />
           </div>
           <div>
             <label className="block text-sm text-gray-600 mb-1">MOT Expiry</label>
             <input
               type="date"
               value={formData.motExpiry}
               onChange={(e) => setFormData({...formData, motExpiry: e.target.value})}
               className="w-full p-2 border rounded"
               required
             />
           </div>
           <div className="flex gap-2">
             <button onClick={handleSubmit} className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
               {initialData ? 'Update Car' : 'Add Car'}
             </button>
             <button onClick={onCancel} className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400">
               Cancel
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 };


 const RecordForm = ({ type, onSubmit, onCancel, initialData = null, initialCarId = '' }) => {
   const [formData, setFormData] = useState(initialData ||
     (type === 'fuel'
       ? { date: '', amount: '', mileage: '' }
       : { date: '', type: '', cost: '', mileage: '', notes: '' })
   );


   const [localCarId, setLocalCarId] = useState(
     initialData ? String(initialData.carId) : String(initialCarId)
   );


   useEffect(() => {
     if (initialData) {
       setLocalCarId(String(initialData.carId));
     } else {
       setLocalCarId(String(initialCarId));
     }
   }, [initialData, initialCarId]);

//|| isNaN(localCarId)
   const handleSubmit = () => {
     if (localCarId === '' || !formData.date || formData.mileage === '') {
       // Using a custom modal/message box instead of alert()
       console.log("Please select a car and fill in all required fields.");
       return;
     }
     if (type === 'fuel' && (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0)) {
       // Using a custom modal/message box instead of alert()
       console.log("Please enter a valid fuel amount.");
       return;
     }
     if (type === 'maintenance' && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0)) {
       // Using a custom modal/message box instead of alert()
       console.log("Please enter a valid cost.");
       return;
     }
     onSubmit(formData, localCarId);
   };


   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
       <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
         <h3 className="text-lg font-semibold mb-4">{initialData ? `Edit ${type === 'fuel' ? 'Fuel' : 'Maintenance'} Record` : `Add ${type === 'fuel' ? 'Fuel' : 'Maintenance'} Record`}</h3>
         <div className="space-y-4">
           <select
             value={localCarId}
             onChange={(e) => setLocalCarId(e.target.value)}
             className="w-full p-2 border rounded"
             required
             disabled={!!initialData}
           >
             <option value="">Select Car</option>
             {cars.map(car => (
               <option key={car.id} value={String(car.id)}>{car.name}</option>
             ))}
           </select>
          
           <input
             type="date"
             value={formData.date}
             onChange={(e) => setFormData({...formData, date: e.target.value})}
             className="w-full p-2 border rounded"
             required
           />
          
           {type === 'fuel' ? (
             <input
               type="number"
               step="0.01"
               placeholder="Amount Spent ($)"
               value={formData.amount}
               onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
               className="w-full p-2 border rounded"
               required
             />
           ) : (
             <>
               <input
                 type="text"
                 placeholder="Service Type (e.g., Oil Change)"
                 value={formData.type}
                 onChange={(e) => setFormData({...formData, type: e.target.value})}
                 className="w-full p-2 border rounded"
                 required
               />
               <input
                 type="number"
                 step="0.01"
                 placeholder="Cost ($)"
                 value={formData.cost}
                 onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value)})}
                 className="w-full p-2 border rounded"
                 required
               />
               <textarea
                 placeholder="Notes (optional)"
                 value={formData.notes}
                 onChange={(e) => setFormData({...formData, notes: e.target.value})}
                 className="w-full p-2 border rounded h-20"
               />
             </>
           )}
          
           <input
             type="number"
             placeholder="Current Mileage"
             value={formData.mileage}
             onChange={(e) => setFormData({...formData, mileage: e.target.value === '' ? '' : e.target.value})}
             className="w-full p-2 border rounded"
             required
           />
          
           <div className="flex gap-2">
             <button onClick={handleSubmit} className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
               {initialData ? 'Update Record' : 'Add Record'}
             </button>
             <button onClick={onCancel} className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400">
               Cancel
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 };


 const ConfirmDeleteModal = ({ car, onConfirm, onCancel }) => {
   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
       <div className="bg-white rounded-lg p-6 w-full max-w-sm">
         <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
         <p className="mb-4">Are you sure you want to delete <span className="font-medium">{car.name}</span>?</p>
         <p className="text-sm text-gray-600 mb-6">This will also remove all associated fuel and maintenance records.</p>
         <div className="flex gap-2 justify-end">
           <button onClick={onCancel} className="bg-gray-300 p-2 rounded hover:bg-gray-400">
             Cancel
           </button>
           <button onClick={onConfirm} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">
             Delete
           </button>
         </div>
       </div>
     </div>
   );
 };


 // --- Main Render Logic ---
 if (!isAuthReady) {
   // Show a general loading screen while Firebase Auth initializes
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="flex flex-col items-center">
         <Loader2 className="animate-spin text-blue-500" size={48} />
         <p className="mt-4 text-gray-700">Initializing app...</p>
       </div>
     </div>
   );
 }


 if (!userId) {
   // If not authenticated, show the login screen
   return (
     <AuthScreen
       onSignIn={handleGoogleSignIn}
       authError={authError}
       isLoadingAuth={isLoadingAuth}
     />
   );
 }


 // If authenticated and data is loading, show data loading spinner
 if (isLoadingCars || isLoadingFuelRecords || isLoadingMaintenanceRecords) {
   return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="flex flex-col items-center">
         <Loader2 className="animate-spin text-blue-500" size={48} />
         <p className="mt-4 text-gray-700">Loading your car data...</p>
       </div>
     </div>
   );
 }


 // If authenticated and data loaded, render the main app
 return (
   <div className="min-h-screen bg-gray-50">
     {/* Header */}
     <div className="bg-white shadow-sm border-b">
       <div className="max-w-4xl mx-auto px-4 py-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Car className="text-blue-500" size={24} />
             <h1 className="text-xl font-semibold">Car Manager</h1>
           </div>
           <div className="flex items-center gap-4">
             {notifications.length > 0 && (
               <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-full">
                 <Bell size={16} />
                 <span className="text-sm font-medium">{notifications.length} upcoming</span>
               </div>
             )}
             {/* User and Logout Button */}
             <div className="relative group">
               <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                 <User size={18} />
                 <span className="sr-only">User Menu</span>
               </button>
               <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10 pointer-events-none group-hover:pointer-events-auto">
                   <div className="py-1">
                     <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                       Logged in as: {auth?.currentUser?.email || "User"}
                     </div>
                     <button
                       onClick={handleLogout}
                       className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                     >
                       <LogOut size={16} /> Logout
                     </button>
                   </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>


     {/* Navigation */}
     <div className="max-w-4xl mx-auto px-4">
       <div className="flex gap-1 mt-4">
         {['cars', 'fuel', 'maintenance', 'notifications'].map(tab => (
           <button
             key={tab}
             onClick={() => {
               setActiveTab(tab);
               setFilterCarId(''); // Reset filter when changing tabs
             }}
             className={`px-4 py-2 rounded-t-lg capitalize ${
               activeTab === tab
                 ? 'bg-white border-b-2 border-blue-500 text-blue-600'
                 : 'text-gray-600 hover:bg-gray-100'
             }`}
           >
             {tab}
           </button>
         ))}
       </div>
     </div>


     {/* Content */}
     <div className="max-w-4xl mx-auto px-4 pb-8">
       <div className="bg-white rounded-b-lg shadow-sm min-h-96">
        
         {/* Cars Tab */}
         {activeTab === 'cars' && (
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold">My Cars</h2>
               <button
                 onClick={() => setShowAddCar(true)}
                 className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
               >
                 <Plus size={16} />
                 Add Car
               </button>
             </div>
            
             <div className="grid gap-4">
               {cars.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   <Car size={48} className="mx-auto mb-4 text-gray-300" />
                   <p>No cars added yet. Click "Add Car" to get started!</p>
                 </div>
               ) : (
                 cars.map(car => (
                   <div key={car.id} className="border rounded-lg p-4">
                     <div className="flex flex-col gap-4">
                       {car.photo && (
                         <div className="w-full">
                           <img src={car.photo} alt={car.name} className="w-full h-48 object-cover rounded" />
                         </div>
                       )}
                       <div className="flex-grow">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h3 className="font-semibold text-lg">{car.name}</h3>
                             <p className="text-gray-600">{car.year} • {car.color}</p>
                             <p className="text-sm text-gray-500">Current mileage: {car.mileage?.toLocaleString()} miles</p>
                           </div>
                           <div className="flex gap-2">
                             <button
                               onClick={() => setEditingCar(car)}
                               className="text-blue-500 hover:text-blue-700 p-1"
                             >
                               <Edit3 size={16} />
                             </button>
                             <button
                               onClick={() => {
                                 setCarToDelete(car);
                                 setShowConfirmDelete(true);
                               }}
                               className="text-red-500 hover:text-red-700 p-1"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </div>
                        
                         <div className="grid grid-cols-2 gap-3 text-sm">
                           <div>
                             <p className="text-gray-500">Insurance Expires</p>
                             <p className="font-medium">{new Date(car.insuranceExpiry).toLocaleDateString()}</p>
                           </div>
                           <div>
                             <p className="text-gray-500">Tax Expires</p>
                             <p className="font-medium">{new Date(car.taxExpiry).toLocaleDateString()}</p>
                           </div>
                           <div>
                             <p className="text-gray-500">Road Tax Expires</p>
                             <p className="font-medium">{new Date(car.roadTaxExpiry).toLocaleDateString()}</p>
                           </div>
                           <div>
                             <p className="text-gray-500">MOT Expires</p>
                             <p className="font-medium">{new Date(car.motExpiry).toLocaleDateString()}</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>
         )}


         {/* Fuel Tab */}
         {activeTab === 'fuel' && (
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold">Fuel Records</h2>
               <div className="flex items-center gap-2">
                 <select
                   value={filterCarId}
                   onChange={(e) => setFilterCarId(e.target.value)}
                   className="p-2 border rounded"
                 >
                   <option value="">All Cars</option>
                   {cars.map(car => (
                     <option key={car.id} value={car.id}>{car.name}</option>
                   ))}
                 </select>
                 <button
                   onClick={() => {
                     setShowAddRecord('fuel');
                   }}
                   className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
                 >
                   <Fuel size={16} />
                   Add Fuel Record
                 </button>
               </div>
             </div>
            
             <div className="space-y-3">
               {fuelRecords
                 .filter(record => filterCarId === '' || record.carId === filterCarId)
                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 .map(record => {
                 const car = cars.find(c => c.id === record.carId);
                 return (
                   <div key={record.id} className="border rounded-lg p-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-medium">{car?.name}</h4>
                         <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                       </div>
                       <div className="text-right flex items-center gap-2">
                         <div>
                           <p className="font-semibold">${record.amount?.toFixed(2)}</p>
                           <p className="text-sm text-gray-600">{record.mileage?.toLocaleString()} miles</p>
                         </div>
                         <button
                           onClick={() => {
                             setEditingFuelRecord(record);
                           }}
                           className="text-blue-500 hover:text-blue-700 p-1"
                         >
                           <Edit3 size={16} />
                         </button>
                       </div>
                     </div>
                   </div>
                 );
               })}
               {fuelRecords.filter(record => filterCarId === '' || record.carId === filterCarId).length === 0 && (
                 <div className="text-center py-8 text-gray-500">
                   <Fuel size={48} className="mx-auto mb-4 text-gray-300" />
                   <p>No fuel records {filterCarId && `for ${cars.find(c => c.id === filterCarId)?.name}`}</p>
                 </div>
               )}
             </div>
           </div>
         )}


         {/* Maintenance Tab */}
         {activeTab === 'maintenance' && (
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold">Maintenance Records</h2>
               <div className="flex gap-2 items-center">
                 <select
                   value={filterCarId}
                   onChange={(e) => setFilterCarId(e.target.value)}
                   className="p-2 border rounded"
                 >
                   <option value="">All Cars</option>
                   {cars.map(car => (
                     <option key={car.id} value={car.id}>{car.name}</option>
                   ))}
                 </select>
                 <div className="flex bg-gray-100 rounded-lg p-1">
                   <button
                     onClick={() => setMaintenanceView('all')}
                     className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                       maintenanceView === 'all'
                         ? 'bg-white text-blue-600 shadow-sm'
                         : 'text-gray-600 hover:text-gray-800'
                     }`}
                   >
                     All
                   </button>
                   <button
                     onClick={() => setMaintenanceView('past')}
                     className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                       maintenanceView === 'past'
                         ? 'bg-white text-blue-600 shadow-sm'
                         : 'text-gray-600 hover:text-gray-800'
                     }`}
                   >
                     Past
                   </button>
                   <button
                     onClick={() => setMaintenanceView('planned')}
                     className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                       maintenanceView === 'planned'
                         ? 'bg-white text-blue-600 shadow-sm'
                         : 'text-gray-600 hover:text-gray-800'
                     }`}
                   >
                     Planned
                   </button>
                 </div>
                 <button
                   onClick={() => {
                     setShowAddRecord('maintenance');
                   }}
                   className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
                 >
                   <Wrench size={16} />
                   Add Record
                 </button>
               </div>
             </div>
            
             <div className="space-y-3">
               {maintenanceRecords
                 .filter(record => filterCarId === '' || record.carId === filterCarId)
                 .filter(record => {
                   if (maintenanceView === 'past') return !record.isPlanned;
                   if (maintenanceView === 'planned') return record.isPlanned;
                   return true;
                 })
                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 .map(record => {
                   const car = cars.find(c => c.id === record.carId);
                   const isPast = !record.isPlanned;
                   return (
                     <div key={record.id} className={`border-l-4 p-4 rounded-r-lg ${
                       isPast ? 'bg-white' : 'bg-blue-50 border-blue-200'
                     }`}>
                       <div className="flex justify-between items-start">
                         <div className="flex-grow">
                           <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-medium">{car?.name}</h4>
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                               isPast
                                 ? 'bg-green-100 text-green-700'
                                 : 'bg-blue-100 text-blue-700'
                             }`}>
                               {isPast ? 'Completed' : 'Planned'}
                             </span>
                           </div>
                           <p className="text-blue-600 font-medium">{record.type}</p>
                           <p className="text-sm text-gray-600 mb-2">{new Date(record.date).toLocaleDateString()}</p>
                           {record.notes && <p className="text-sm text-gray-500">{record.notes}</p>}
                         </div>
                         <div className="text-right ml-4 flex items-center gap-2">
                           <div>
                             <p className="font-semibold">${record.cost?.toFixed(2)}</p>
                             <p className="text-sm text-gray-600">{record.mileage?.toLocaleString()} miles</p>
                           </div>
                           <button
                             onClick={() => {
                               setEditingMaintenanceRecord(record);
                             }}
                             className="text-blue-500 hover:text-blue-700 p-1"
                           >
                             <Edit3 size={16} />
                           </button>
                         </div>
                       </div>
                     </div>
                   );
                 })}
              
               {maintenanceRecords.filter(record => filterCarId === '' || record.carId === filterCarId).filter(record => {
                 if (maintenanceView === 'past') return !record.isPlanned;
                 if (maintenanceView === 'planned') return record.isPlanned;
                 return true;
               }).length === 0 && (
                 <div className="text-center py-8 text-gray-500">
                   <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
                   <p>No {maintenanceView === 'past' ? 'past' : maintenanceView === 'planned' ? 'planned' : ''} maintenance records {filterCarId && `for ${cars.find(c => c.id === filterCarId)?.name}`}</p>
                 </div>
               )}
             </div>
           </div>
         )}


         {/* Notifications Tab */}
         {activeTab === 'notifications' && (
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold">Upcoming Renewals</h2>
               <select
                 value={filterCarId}
                 onChange={(e) => setFilterCarId(e.target.value)}
                 className="p-2 border rounded"
               >
                 <option value="">All Cars</option>
                 {cars.map(car => (
                   <option key={car.id} value={car.id}>{car.name}</option>
                 ))}
               </select>
             </div>
            
             {notifications.filter(notification => filterCarId === '' || cars.find(c => c.name === notification.car)?.id === filterCarId).length === 0 ? (
               <div className="text-center py-8 text-gray-500">
                 <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                 <p>No upcoming renewals in the next 30 days {filterCarId && `for ${cars.find(c => c.id === filterCarId)?.name}`}</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {notifications
                   .filter(notification => filterCarId === '' || cars.find(c => c.name === notification.car)?.id === filterCarId)
                   .map((notification, index) => (
                   <div key={index} className={`border-l-4 p-4 rounded-r-lg ${
                     notification.status === 'expired' ? 'border-red-500 bg-red-50' :
                     notification.status === 'upcoming-10' ? 'border-orange-500 bg-orange-50' :
                     'border-yellow-500 bg-yellow-50'
                   }`}>
                     <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-medium">{notification.car}</h4>
                         <p className="text-sm text-gray-600">{new Date(notification.date).toLocaleDateString()}</p>
                       </div>
                       <div className={`px-2 py-1 rounded text-sm font-medium ${
                         notification.status === 'expired' ? 'bg-red-200 text-red-800' :
                         notification.status === 'upcoming-10' ? 'bg-orange-200 text-orange-800' :
                         'bg-yellow-200 text-yellow-800'
                       }`}>
                         {notification.daysLeft <= 0 ? 'Expired' : `${notification.daysLeft} days left`}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
       </div>
     </div>


     {/* Modals */}
     {showAddCar && (
       <CarForm
         onSubmit={addCar}
         onCancel={() => setShowAddCar(false)}
       />
     )}
    
     {editingCar && (
       <CarForm
         initialData={editingCar}
         onSubmit={editCar}
         onCancel={() => setEditingCar(null)}
       />
     )}
    
     {showAddRecord && (
       <RecordForm
         type={showAddRecord}
         initialCarId={filterCarId || (cars.length > 0 ? String(cars[0].id) : '')}
         onSubmit={showAddRecord === 'fuel' ? addFuelRecord : addMaintenanceRecord}
         onCancel={() => setShowAddRecord(false)}
       />
     )}


     {editingFuelRecord && (
       <RecordForm
         type="fuel"
         initialData={editingFuelRecord}
         onSubmit={editFuelRecord}
         onCancel={() => setEditingFuelRecord(null)}
       />
     )}


     {editingMaintenanceRecord && (
       <RecordForm
         type="maintenance"
         initialData={editingMaintenanceRecord}
         onSubmit={editMaintenanceRecord}
         onCancel={() => setEditingMaintenanceRecord(null)}
       />
     )}


     {showConfirmDelete && carToDelete && (
       <ConfirmDeleteModal
         car={carToDelete}
         onConfirm={() => deleteCar(carToDelete.id)}
         onCancel={() => {
           setShowConfirmDelete(false);
           setCarToDelete(null);
         }}
       />
     )}
   </div>
 );
};


export default CarManagerApp;



