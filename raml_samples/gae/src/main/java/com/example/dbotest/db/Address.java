// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;
	

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Basic;

/**
 * An address (quite simple implementation)
 */
@Entity
class Address{
	// Properties:
	private Integer id;
	private String country;
	private String city;
	private String street;
	private String house;
	
	// Getters:
	public Integer getId() { 
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
	public void setId(Integer id) { 
		this.id=id;
	};
	public void setCountry(String country) { 
		this.country=country;
	};
	public void setCity(String city) { 
		this.city=city;
	};
	public void setStreet(String street) { 
		this.street=street;
	};
	public void setHouse(String house) { 
		this.house=house;
	};
}