// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;
import com.googlecode.objectify.annotation.Index;
import com.googlecode.objectify.annotation.Parent;
import com.googlecode.objectify.annotation.Subclass;
import com.googlecode.objectify.Key;


/**
 * An address (quite simple implementation)
 */
@Entity
public class Address{
	// Properties:
	@Id
	private  Long id;
	private  String country;
	private  String city;
	private  String street;
	private  String house;
	
	// Getters:
	
	public Long getId() { 
		return id;
	};
	public String getCountry() { 
		return country;
	};
	public String getCity() { 
		return city;
	};
	public String getStreet() { 
		return street;
	};
	public String getHouse() { 
		return house;
	};
	
	// Setters:
	
	public void setId(Long id) { 
		this.id = id;
	};
	public void setCountry(String country) { 
		this.country = country;
	};
	public void setCity(String city) { 
		this.city = city;
	};
	public void setStreet(String street) { 
		this.street = street;
	};
	public void setHouse(String house) { 
		this.house = house;
	};
}