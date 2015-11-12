// This file is generated.
// please don't edit it manually.

package com.example.dbotest.db;
	

import com.googlecode.objectify.annotation.Entity;
import com.googlecode.objectify.annotation.Id;
import com.googlecode.objectify.annotation.Index;
import com.googlecode.objectify.annotation.Parent;
import com.googlecode.objectify.Key;

/**
 * Pet that can live at some address and have an owner
 */
@Entity
public class Pet{
	// Properties:
	@Id
	private Long id;
	private Long owner;
	private String name;
	private Long addressId;
	
	// Getters:
	public Long getId() { 
		return id;
	};
	public Long getOwner() { 
		return owner;
	};
	public String getName() { 
		return name;
	};
	public Long getAddressId() { 
		return addressId;
	};
	
	// Setters:
	public void setId(Long id) { 
		this.id=id;
	};
	public void setOwner(Long owner) { 
		this.owner=owner;
	};
	public void setName(String name) { 
		this.name=name;
	};
	public void setAddressId(Long addressId) { 
		this.addressId=addressId;
	};
}