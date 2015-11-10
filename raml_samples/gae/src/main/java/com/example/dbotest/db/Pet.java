// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;
	

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Basic;

/**
 * Pet that can live at some address and have an owner
 */
@Entity
class Pet{
	// Properties:
	private Integer id;
	private Integer owner;
	private String name;
	private Integer addressId;
	
	// Getters:
	public Integer getId() { 
		return id;
	};
	public Integer getOwner() { 
		return owner;
	};
	public String getName() { 
		return name;
	};
	public Integer getAddressId() { 
		return addressId;
	};
	
	// Setters:
	public void setId(Integer id) { 
		this.id=id;
	};
	public void setOwner(Integer owner) { 
		this.owner=owner;
	};
	public void setName(String name) { 
		this.name=name;
	};
	public void setAddressId(Integer addressId) { 
		this.addressId=addressId;
	};
}