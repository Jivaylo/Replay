import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Home() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  const records = [
    {
      id: 1,
      title: "Pink Floyd – Dark Side of the Moon",
      price: 35,
      img: "https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png",
    },
    {
      id: 2,
      title: "The Beatles – Abbey Road",
      price: 42,
      img: "https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg",
    },
    {
      id: 3,
      title: "Michael Jackson – Thriller",
      price: 30,
      img: "https://upload.wikimedia.org/wikipedia/en/5/55/Michael_Jackson_-_Thriller.png",
    },
  ];

  return (
    <div className="p-10">
      {!session ? (
        <div className="text-center">
          <h1 className="text-4xl font-extrabold mb-6">
            🎶 Welcome to Records Marketplace
          </h1>
          <p className="text-lg mb-10">
            Login or Register to explore, buy, and sell vinyls with collectors
            around the world.
          </p>

         
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-white text-black rounded-lg shadow-lg overflow-hidden"
              >
                <img
                  src={record.img}
                  alt={record.title}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h2 className="font-bold text-lg">{record.title}</h2>
                  <p className="text-green-600 font-semibold">
                    ${record.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-extrabold mb-6">
            🎉 Welcome back to Records Marketplace!
          </h1>
          <p className="text-lg mb-4">
            Start browsing vinyls or list your own for sale 🚀
          </p>

        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-white text-black rounded-lg shadow-lg overflow-hidden"
              >
                <img
                  src={record.img}
                  alt={record.title}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h2 className="font-bold text-lg">{record.title}</h2>
                  <p className="text-green-600 font-semibold">
                    ${record.price}
                  </p>
                
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
