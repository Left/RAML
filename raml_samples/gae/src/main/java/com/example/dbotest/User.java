// This file is generated.
// please don't edit it manually.

package com.example.dbotest;
	

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Basic;
import com.example.dbotest.Phone;

/**
 * System's user
 */
@Entity
class User{
	// Properties:
	private Integer id;
	private String firstName;
	private String lastName;
	private Phone homePhone;
	private Phone cellPhone;
	private Integer addressId;
	
	// Getters:
	public Integer getId() { 
		return id;
	};
	public String getFirstName() { 
		return firstName;
	};
	public String getLastName() { 
		return lastName;
	};
	public Phone getHomePhone() { 
		return homePhone;
	};
	public Phone getCellPhone() { 
		return cellPhone;
	};
	public Integer getAddressId() { 
		return addressId;
	};
	
	// Setters:
	public void setId(Integer id) { 
		this.id=id;
	};
	public void setFirstName(String firstName) { 
		this.firstName=firstName;
	};
	public void setLastName(String lastName) { 
		this.lastName=lastName;
	};
	public void setHomePhone(Phone homePhone) { 
		this.homePhone=homePhone;
	};
	public void setCellPhone(Phone cellPhone) { 
		this.cellPhone=cellPhone;
	};
	public void setAddressId(Integer addressId) { 
		this.addressId=addressId;
	};
}