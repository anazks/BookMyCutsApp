const asyncHandler = require("express-async-handler");
const jwt = require('jsonwebtoken');
const  SaveProfileToCloud  = require('../CloudStorageCurds/SaveProfileToCloude')
const secretkey = process.env.secretKey;
const ServiceModel = require('../Model/ServiceModel')

const {
    updateBankDetailsFunction,
    saveBankDetailsFunction,
    addShop,
    viewAllShops,
    addServices,
    viewAllServices,
    addBarbers,
    viewAllBarbers,
    getAShop,
    getMyService,
    getMyBarbers,
    getAllBookingsOfShop,
    getShopUser,
    getMyshop,
    getShopService,
    getShopBarbers,
    editBarberProfile,
    deleteBarberFunction,
    makePremiumFunction,
    getAllPremiumShopsFunction,
    viewbankDetailsFunction,
    deleteBankdetailsFunction,
    editServiceFunction,
    deleteServiceFunction,
    deleteShopFuntion,
    findNearbyShopsFunction,
    deleteMediaFile,
    updateMediaDetailsFunction,
    getUniqueService,
    filterShopsByServiceFunction
} = require('../Repo/ShopRepo');
const Decoder = require("../../TokenDecoder/Decoder");
const { json } = require("express");
const { convertToGeocode,findNearestShops } = require('../UseCase/useCaseShop');
const { TrunkContextImpl } = require("twilio/lib/rest/routes/v2/trunk");
const ShopModel = require("../Model/ShopModel");

const AddShop = asyncHandler(async (req, res) => {
    const data = req.body;
    console.log("Data received for adding shop:", data);
    // Validate presence of data
    if (!data) {
        return res.status(400).json({
            success: false,
            message: "No shop data provided"
        });
    }

    // Check for token
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        // Decode the token
        const decoded = jwt.verify(token, secretkey);
        req.userId = decoded.id;

        // Add userId to the shop data
        data.ShopOwnerId = req.userId;

        console.log("Data received for adding shop:", data);

        let geocode = await convertToGeocode(data)
        console.log("geocode:",geocode)
        if(geocode.success){
           data.ExactLocationCoord = {
            type:"Point",
            coordinates:[geocode.longitude,geocode.latitude]
           }
        }
        const shopAdded = await addShop(data);
        console.log("Shop added:", shopAdded);  
        if (shopAdded) {
            return res.status(201).json({
                success: true,
                message: "Shop added successfully",
                data: shopAdded,
                geocode
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to add shop"
            });
        }

    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
});


const ViewAllShop = asyncHandler(async (req, res) => {
    try {
        const allShops = await viewAllShops();
        if (!allShops || allShops.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No shops found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "All shops retrieved successfully",
            data: allShops
        });
    } catch (error) {
        console.error("Error fetching shops:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const addService = asyncHandler(async (req, res) => {
    const data = req.body;
    if (!data) {
        return res.status(400).json({
            success: false,
            message: "No service data provided"
        });
    }

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, secretkey);
        data.shoperId = decoded.id;

        const addedService = await addServices(data);
        if (addedService) {
            return res.status(201).json({
                success: true,
                message: "Service added successfully",
                data: addedService
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to add service"
        });
    } catch (error) {
        console.error("Error adding service:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const ViewAllServices = asyncHandler(async (req, res) => {
    try {
        const allServices = await viewAllServices();
        if (!allServices || allServices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No services found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "All services retrieved successfully",
            data: allServices
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const addBarber = asyncHandler(async (req, res) => {
    const data = req.body;
    console.log("addBarber requesting data:",data)
    if (!data) {
        return res.status(400).json({
            success: false,
            message: "No barber data provided"
        });
    }

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, secretkey);
        data.shoperId = decoded.id;

        const addedBarber = await addBarbers(data);
        if (addedBarber) {
            return res.status(201).json({
                success: true,
                message: "Barber added successfully",
                data: addedBarber
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to add barber"
        });
    } catch (error) {
        console.error("Error adding barber:", error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const ViewAllBarbers = asyncHandler(async (req, res) => {
    try {
        const allBarbers = await viewAllBarbers();
        if (!allBarbers || allBarbers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No barbers found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "All barbers retrieved successfully",
            data: allBarbers
        });
    } catch (error) {
        console.error("Error fetching barbers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const viewSigleShop = asyncHandler(async (req, res) => {
    try {
        // const shopOwnerId = req.userId;
        console.log("Request body:", req.body);
        const shop = await getAShop(req.body.id);
        console.log("Shop data:--------", shop);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Shop retrieved successfully",
            data: shop
        });
    } catch (error) {
        console.error("Error fetching shop:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const viewMyService = asyncHandler(async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const tokenData = await Decoder(token);
        const myServices = await getMyService(tokenData.id);
        
        if (!myServices || myServices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No services found for this shop"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "Services retrieved successfully",
            data: myServices
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const viewMyBarbers = asyncHandler(async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log(token,"token")
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const tokenData = await Decoder(token);
        const myBarbers = await getMyBarbers(tokenData.id);
        return res.status(200).json({
            success: true,
            message: "Barbers retrieved successfully",
            data: myBarbers
        });
    } catch (error) {
        console.error("Error fetching barbers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const viewAllBookingOfShops = asyncHandler(async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        const tokenData = await Decoder(token);
        console.log(tokenData)
        const bookings = await getAllBookingsOfShop(tokenData.id);
        console.log(bookings)
        return res.status(200).json({
            success: true,
            message: "Bookings retrieved successfully",
            data: bookings
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const myprofile = asyncHandler(async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const tokenData = await Decoder(token);
        const shopData = await getShopUser(tokenData.id);
        
        if (!shopData) {
            return res.status(404).json({
                success: false,
                message: "Shop profile not found"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "Profile retrieved successfully",
            data: shopData
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
const viewMyshop = asyncHandler(async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const tokenData = await Decoder(token);
        const myShop = await getMyshop(tokenData.id);
            console.log("My shop data:--------", myShop);
        if (!myShop) {
            return res.status(404).json({
                success: false,
                message: "My shop not found"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "My shop retrieved successfully",
            data: myShop
        });
    } catch (error) {
        console.error("Error fetching my shop:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})
const viewSingleShopService = asyncHandler(async (req, res) => {
    const shopId = req.params.id;
    if (!shopId) {
        return res.status(400).json({
            success: false,
            message: "Shop ID is required"
        });
    }

    try {
        const services = await getShopService(shopId);
        // if (!services || services.length === 0) {
        //     return res.status(404).json({
        //         success: false,
        //         message: "No services found for this shop"
        //     });
        // }
        
        return res.status(200).json({
            success: true,
            message: "Services retrieved successfully",
            data: services
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})
const viewSingleShopBarbers = asyncHandler(async (req, res) => {
    const shopId = req.params.id;
    if (!shopId) {
        return res.status(400).json({
            success: false,
            message: "Shop ID is required"
        });
    }

    try {
        const barbers = await getShopBarbers(shopId);
        // if (!barbers || barbers.length === 0) {
        //     return res.status(404).json({
        //         success: false,
        //         message: "No barbers found for this shop"
        //     });
        // }
        
        return res.status(200).json({
            success: true,
            message: "Barbers retrieved successfully",
            data: barbers
        });
    } catch (error) {
        console.error("Error fetching barbers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

const updateBarber = async (req,res) => {
    try {
        const barberId = req.params.id
        let data = req.body
        const barber = await editBarberProfile(barberId,data)
        console.log("edited document:",barber)
        if(!barber || barber.lenght === 0){
             return res.status(404).json({
                success: false,
                message: "barber not found"
            });
        }

          return res.status(200).json({
            success: true,
            message: "successfully updated barber",
            data: barber
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success: false,
            message:"internal server error"
        })
    }
}

const deleteBarber = async (req, res) => {
  try {
    const barberId = req.params.id
    const barber = await deleteBarberFunction(barberId)

    if (!barber) {
      // nothing was deleted because document not found
      return res.status(404).json({
        success: false,
        message: 'Barber not found'
      })
    }

    // deletion successful — return the deleted document or a success message
    return res.status(200).json({
      success: true,
      message: 'Barber successfully deleted',
      data: barber
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}


const makePremium =  async (req,res) => {
    try {
        const {shopId} = req.body
        const premium = await makePremiumFunction(shopId)
        if(!premium || premium.length === 0){
            return res.status(404).json({
                succuss:true,
                message:"premium subscirption is failed"
            })
        }else{
            return res.status(200).json({
                success:true,
                message:"successfully subscribed to premium",
                premium
            })
        }
    } catch (error) {
            console.error(error)
            return res.status(500).json({
                success:false,
                message:"internal server error"
            })
    }
}

const getAllPremiumShops = async (req,res) => {
    try {
        let premiumShops = await getAllPremiumShopsFunction()
        if(!premiumShops){
            return res.status(404).json({
                success:false,
                message:"get all premium shops is faied"
            })
        }else{
            return res.status(200).json({
                success:true,
                message:"successfully get all premium shops",
                premiumShops
            })
        }
    } catch (error) {
        console.error(error)
         return res.status(500).json({
                success:false,
                message:"internal server error"
            })
    }
}

const saveBankDetails = async (req,res) => {
    try {
        const shoperId = req.params.id
        const data = req.body
        const bankDetails = await saveBankDetailsFunction(data,shoperId)
        if(!bankDetails){
            return res.status(404).json({
                success:false,
                message:"failed to save bank details"
            })
        }else{
            return res.status(200).json({
                success:true,
                message:"successfully saved bank details",
                bankDetails
            })
        }
    } catch (error) {
        console.error(error)
         return res.status(500).json({
                success:false,
                message:"internal server error"
            })
    }
}

const viewbankDetails = async (req,res) => {
    try {
       const shoperId = req.params.id
       const bankDetails = await viewbankDetailsFunction(shoperId) 
       console.log("Bank details",bankDetails)
       if(!bankDetails){
          return res.status(404).json({
                success:true,
                message:"fetching bank details is failed",
          })
       }else{
          return res.status(200).json({
                success:true,
                message:"successfully fetched bank details",
                bankDetails
          })
       }
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}

const deleteBankDetails = async (req,res) => {
    try {
        const shoperId = req.params.id
        const bankDetails = await deleteBankdetailsFunction(shoperId)
        if(!bankDetails || bankdetails.lenght === 0){
            return res.status(200).json({
                success:true,
                message:"successfully deleted the bank details"
            })
        }else{
            return res.status(404).json({
                success:false,
                message:"deletion failed"
            })
        }
    }
    catch (error) {
       console.error(error) 
       return res.status(500).json({
            success:false,
            message:"internal server error"
       })
    }
}

const upadateBankdetails = async (req,res) => {
    try {
        const shoperId = req.params.id
        const data = req.body
        const bankDetails = await updateBankDetailsFunction(shoperId,data)
        if(bankDetails){
            return res.status(200).json({
                success:true,
                message:"successfully updated bank details",
                bankDetails
            })
        }else{
            return res.status(404).json({
                success:false,
                message:"failed to update the bank details"
            })
        }  
        } catch (error) {
        console.error(erro)
        return res.status(500).json({
            success:failed,
            message:"interal server error"
        })
    }
}

const editService = async (req,res) => {
    try {
      const serviceId = req.params.id 
      console.log("serviceId",serviceId) 
      const data = req.body
      let service = await editServiceFunction(serviceId,data)
      if(!service || service.length === 0 ){
        res.status(404).json({
            success:false,
            message:"failed to updata service",
        })
      }else{
        res.status(200).json({
            success:true,
            message:"successfully edited service",
            service
        })
      }
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
        console.error(error)
    }
}

 const deleteService = async (req,res) => {
   try {
    const serviceId = req.params.id
    let service = deleteServiceFunction(serviceId)
    if(!service){
        res.status(404).json({
            success:false,
            message:"failed deleted  service",
            
        })
    }
    res.status(200).json({
        success:true,
        message:"successfully deleted sevice",
        service
    })
   } catch (error) {
        console.log(error)
   }
 }

const findNearByShops = async (req,res) => {
    try {
        const {lng,lat} = req.query
        console.log("COORDINATES")
        console.log(lng,"lng")
        console.log(lat,"lat")
        const shops = await findNearestShops(lng,lat)
        if(shops.length > 0){
          return  res.status(200).json({
                success:true,
                message:"successfully fetch nearby shops",
                shops
            })
        }
         return  res.status(404).json({
            success:false,
            message:"failed to fetch nearby shops"
        })
    } catch (error) {
        console.error("Error in findNearByShops",error)
        return res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}

const deleteShop = async (req,res) => {
    try {
        const shopId = req.params.id
        const shop = await deleteShopFuntion(shopId)
        if(shop){
          return  res.status(200).json({
                success:true,
                message:"successfully deleted the shop",

            })
        }
          return  res.status(404).json({
            success:false,
            message:"failed to delete shop",

        })
    } catch (error) {
        console.error(error)
      return  res.status(500).json({
            success:false,
            message:"internal server erroo"
        })
    }
}

const addProfileImage = async (req,res) => {
    try {
        const shopId  = req.params.id
        const media = req.file 
        if(!shopId){
            res.status(404).json({error:"shopId is required"})
        }
        if(!media){
            res.status(404).json({error:"no image uploaded"})
        }
        const result = await SaveProfileToCloud(media,shopId)
        res.status(200).json({
            success:true,
            result
        })
        
    } catch (error) {
        res.status(500).json({
            error: "internal server error"
        })
        console.log(error)
    }
}

const deleteMedia = async (req,res) => {
    try {
        const id = req.params.id
        const result = await deleteMediaFile(id)
        if(result){
           return res.status(200).json({
                success:true,
                message:"successfully deleted the file"
            })
        }
        return res.status(404).json({
            success:false,
            message:"failed to delete the file"
        })
    } catch (error) {
        console.log("Error in deleting file",error)
       return res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}

const updateMediaDetails = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Both title and description are required",
      });
    }

    const result = await updateMediaDetailsFunction(mediaId, title, description);

    if (!result || result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Media updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating media:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


async function geocodeTextToCoords(text) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`
  );

  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    place: data[0].display_name
  };
}

const search = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) {
            return res.status(400).json({ message: "Search text required" });
        }

        // 1. Try finding by name first
        let shops = await ShopModel.find({
            ShopName: { $regex: q, $options: "i" }
        });

        // 2. If no shops found by name, try Geocoding
        if (shops.length === 0) {
            const coords = await geocodeTextToCoords(q);
            
            if (coords) {
                const { lat, lng } = coords;
                // Overwrite the 'shops' variable with the nearby results
                shops = await ShopModel.find({
                    ExactLocationCoord: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [lng, lat]
                            },
                            $maxDistance: 10000 
                        }
                    }
                });
            }
        }

        // 3. Final Response (Unified variable name)
        if (shops.length > 0) {
            return res.status(200).json({
                success: true,
                message: "successfully fetch shops",
                shops // This will now contain either Name matches OR Nearby matches
            });
        } else {
            return res.status(404).json({
                success: false, // Changed to false for better logic
                message: "failed to fetch shops",
                shops: [] // Return empty array to prevent frontend map errors
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "internal server error"
        });
    }
}

const fetchAllUniqueService = async (req,res) => {
  try {
    const service = await getUniqueService()
    if(service){
        res.status(200).json({
            success:true,
            message:"successfull fetch service",
            service
        })
    }else{
        res.status(404).json({
            success:true,
            message:"failed to fetch service"
        })
    }
  } catch (error) {
    console.log(error)
  }
}

const filterShopsByService = async (req, res) => {
  try {
    console.log(req.body)
    const { shopIds, serviceName } = req.body;

    if (!shopIds?.length || !serviceName) {
      return res.status(400).json({
        success: false,
        message: "shopIds and serviceName are required"
      });
    }

    const shops = await filterShopsByServiceFunction(shopIds, serviceName);

    return res.status(200).json({
      success: true,
      count: shops.length,
      shops
    });

  } catch (error) {
    console.error("filterShopsByService error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const viewAllService = async (req,res) => {
  try {
     const service = await ServiceModel.find({})
     res.json(service)
  } catch (error) {
    console.log(error)
  }
}


module.exports = {
    viewAllService,
    filterShopsByService,
    fetchAllUniqueService,
    search,
    updateMediaDetails,
    deleteMedia,
    addProfileImage,
    deleteShop,
    findNearByShops,
    deleteService,
    editService,
    upadateBankdetails,
    deleteBankDetails,
    viewbankDetails,
    saveBankDetails,
    getAllPremiumShops,
    makePremium,
    deleteBarber,
    myprofile,
    AddShop,
    ViewAllShop,
    addService,
    ViewAllServices,
    addBarber,
    ViewAllBarbers,
    viewSigleShop,
    viewMyService,
    viewMyBarbers,
    viewAllBookingOfShops,
    viewMyshop,
    viewSingleShopService,
    viewSingleShopBarbers,
    updateBarber
};