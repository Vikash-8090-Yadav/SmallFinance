'use client'

import React, { useState, useEffect } from "react";



import { ethers } from 'ethers'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import { providers } from "ethers";
import { Web3SignatureProvider } from "@requestnetwork/web3-signature";
import { RequestNetwork } from "@requestnetwork/request-client.js"
import { Types, Utils } from "@requestnetwork/request-client.js";

import {payRequest} from "@requestnetwork/payment-processor";


import $, { error } from 'jquery'; 
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { marketplaceAddress } from "../config";
import {Web3} from 'web3';
import { notification } from 'antd';
import ABI from "../SmartContract/artifacts/contracts/InvestmentClub.sol/InvestmentClub.json"


import axios from 'axios';
import getProposalById from '../getProposalById';
import GetClub from '../getclub';
import Tg from "../components/toggle";

// const ethers = require("ethers")


const provider = new ethers.providers.Web3Provider(window.ethereum);
const web3 = new Web3(new Web3.providers.HttpProvider("https://sepolia.drpc.org"));

var contractPublic = null;

var datacontractinstance = null;
var filWalletAddress = localStorage.getItem("filWalletAddress");





async function getContract(userAddress) {
    contractPublic =  new web3.eth.Contract(ABI.abi,marketplaceAddress);
    console.log(contractPublic)
    if(userAddress != null && userAddress != undefined) {
      contractPublic.defaultAccount = userAddress;
    }
  }
  
  await getContract(filWalletAddress);

  var clubId = localStorage.getItem("clubId");
  var proposalId = localStorage.getItem("proposalId");
  
 
  var clubs = await contractPublic.methods.getProposalById(clubId, proposalId).call();

  const destination = clubs.destination.toString();
  const amount =clubs.amount.toString();

        
  var DealId = null;


  const payeeIdentity = destination;
  const payerIdentity = marketplaceAddress; 
  const paymentRecipient = payeeIdentity;
  const feeRecipient = '0x0000000000000000000000000000000000000000';
  alert(payeeIdentity);
  alert(payerIdentity);


  const requestCreateParameters = 
  { 
    requestInfo: {
      
      // The currency in which the request is denominated
      currency: {
        type: Types.RequestLogic.CURRENCY.ETH,
        value: 'eth',
        network: 'sepolia',
      },
      
      // Convert the amount to Wei and then to string
      expectedAmount: ethers.utils.parseEther(web3.utils.fromWei(amount, 'ether')).toString(),
      

     
      
      // The payee identity. Not necessarily the same as the payment recipient.
      payee: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payeeIdentity,
      },
      
      // The payer identity. If omitted, any identity can pay the request.
      payer: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payerIdentity,
      },
      
      // The request creation timestamp.
      timestamp: Utils.getCurrentTimestampInSecond(),
    },
    
    // The paymentNetwork is the method of payment and related details.
    paymentNetwork: {
      id: Types.Extension.PAYMENT_NETWORK_ID.ETH_FEE_PROXY_CONTRACT,
      parameters: {
        paymentNetworkName: 'sepolia',
        paymentAddress: payeeIdentity,
        feeAddress: feeRecipient,  
        feeAmount: '0',
      },
    },
    
    // The contentData can contain anything.
    // Consider using rnf_invoice format from @requestnetwork/data-format
    contentData: {
      reason: '🍕',
      dueDate: '2023.06.16',
    },
    
    // The identity that signs the request, either payee or payer identity.
    signer: {
      type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
      value: filWalletAddress,
    },
  };

  



  function  Proposal() {
    

    const [isVisible, setIsVisible] = useState(true);
  
    const navigate = useNavigate();
    function Logout(){
      web3.eth.accounts.wallet.clear();
      localStorage.clear();
      navigate('/login');
    
    }

    useEffect(() => {
      {
          GetClub();verifyUserInClub();getProposalById();
      }
    }, []);

    async function runProposal(event) {


  const createRequest = async () => {
    // alert("Heyy");
    if (window.ethereum) {
      // const provider = new providers.Web3Provider(window.ethereum);
      // console.log("provider", provider);
      // const accounts = await provider.send("eth_accounts", []);
      // console.log("Accounts:", accounts); // Should not be empty

      const signer = provider.getSigner();
      // console.log('Signer:', signer);
    
      const web3SignatureProvider = new Web3SignatureProvider(provider.provider);
      console.log("Web3SignatureProvider initialized:", web3SignatureProvider);
      
      
      const requestClient=new RequestNetwork({
        nodeConnectionConfig: { 
          baseURL: "https://sepolia.gateway.request.network/",
        },
        signatureProvider: web3SignatureProvider,
      })
      console.log("request Client:",requestClient);
      const request = await requestClient.createRequest(requestCreateParameters);
      
      const confirmedRequestData = await request.waitForConfirmation();
      console.log("confirmed Request Data:",confirmedRequestData);
      

      // get requestId


      console.log("Request Id created sucessfully:",request.requestId);

      // Get Request Data

      let requestData = request.getData();



      const paymentTx= await payRequest(requestData,signer);

      await paymentTx.wait(2);

      console.log("THe poayment is",paymentTx);

      console.log("Payment sent sucessfully",await paymentTx.transactionHash);



      // const request1 = await requestClient.fromRequestId(
      //   '0175854b152c9fd61ad48d8c25a6e4fbecc05390405f15779fab5144fd3e316def',
      // );
      // const requestData1 = request1.getData();


      // console.log("The status is:",requestData1);

      while (requestData.balance?.balance < requestData.expectedAmount) {
        requestData = await request.refresh();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Finished")
      console.log(requestData);


      alert('Wallet connected successfully!');
    } else {
      console.error('Ethereum provider (window.ethereum) is not available. Please install MetaMask.');
    }
  };

  

 

      var filWalletAddress = localStorage.getItem("filWalletAddress");
      await getContract(filWalletAddress);
      if (contractPublic != undefined) {
        var option_execution = $('#option_execution').val()
        var password = $('#passwordShowPVExecution').val();
        if (option_execution == '') {
          $('.errorExecution').css("display", "block");
          $('.errorExecution').text("Option is required");
          return;
        }
        if (password == '') {
          $('.errorExecution').css("display", "block");
          $('.errorExecution').text("Password is invalid");
          return;
        }
        var clubId = localStorage.getItem("clubId");
        var proposalId = localStorage.getItem("proposalId");
        try {
          const my_wallet = await web3.eth.accounts.wallet.load(password);
        
          if (my_wallet !== undefined) {
            $('.errorExecution').css("display", "none");
            $('.successExecution').css("display", "block");
            $('.successExecution').text("Running...");
            
            try {
              const ans = await contractPublic.methods.isVotingOn(clubId, proposalId).call();
  
              if (ans) {
                toast.error("Voting is still ON")
                $('.successExecution').css("display", "none");
                $('.errorExecution').css("display", "block");
                $('.errorExecution').text("Voting is still ON");
              }
              
              if (option_execution == 'execute') {
                await createRequest();
              } else if (option_execution == 'close') {
                const query = contractPublic.methods.closeProposal(clubId, proposalId);
                const encodedABI = query.encodeABI();
                
                try {
                  const abi = ABI.abi;
                  const iface = new ethers.utils.Interface(abi);
                  const encodedData = iface.encodeFunctionData("closeProposal", [clubId, proposalId]);
                  
                  const signer = provider.getSigner();
                  console.log("signer", signer);
                  const tx = {
                    to: marketplaceAddress,
                    data: encodedData,
                  };
                  const txResponse = await signer.sendTransaction(tx);
                  const txReceipt = await txResponse.wait();
  
                  notification.success({
                    message: 'Transaction Successful',
                    description: (
                      <div>
                        Transaction Hash: <a href={`https://sepolia.lineascan.build/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
                      </div>
                    )
                  });
  
                  console.log(txReceipt.transactionHash);
                  setIsVisible(false); // Hide the component when the 'close' option is executed
                } catch (error) {
                  console.log(error)
                }
              }
            } catch (error) {
              console.log(error)
              $('.successExecution').css("display", "none");
              $('.errorExecution').css("display", "block");
              $('.errorExecution').text("Error executing/closing the proposal");
              return;
            }
          } else {
            toast.error("Invalid wallet")
          }
        } catch (error) {
          console.log(error)
        }
      }
    }
  

    if (!isVisible) {
      return null;
    }



async function SaveDataToBlockchain(){
  var filWalletAddress = localStorage.getItem("filWalletAddress");
  await getContract(filWalletAddress);
  if(contractPublic != undefined) {
    var option_execution = $('#option_execution').val()
    var password = $('#passwordShowPVExecution').val();
    if(option_execution == '') {
      $('.errorExecution1').css("display","block");
      $('.errorExecution1').text("Option is required");
      return;
    }
    if(password == '') {
      $('.errorExecution1').css("display","block");
      $('.errorExecution1').text("Password is invalid");
      return;
    }
    var clubId = localStorage.getItem("clubId");
    var proposalId = localStorage.getItem("proposalId");
    try {
      const my_wallet = await web3.eth.accounts.wallet.load(password);
    
    if(my_wallet !== undefined)
    {
      

      $('.errorExecution1').css("display","none");
      $('.successExecution1').css("display","block");
      $('.successExecution1').text("Running...");
      var clubId = localStorage.getItem("clubId");
      var proposalId = localStorage.getItem("proposalId");
      
        try {
          const ans  = await contractPublic.methods.isVotingOn(clubId,proposalId).call();

          if(ans){
            toast.error("Voting is still ON")
            $('.successExecution1').css("display","none");
            $('.errorExecution1').css("display","block");
            $('.errorExecution1').text("Voting is still ON");
          }
          
      
            const query = await contractPublic.methods.executeProposal(clubId,proposalId);
            const encodedABI = query.encodeABI();
            
            
            try{
              const abi = ABI.abi;
                const iface = new ethers.utils.Interface(abi);
                const encodedData = iface.encodeFunctionData("executeProposal", [clubId,proposalId]);
                const GAS_MANAGER_POLICY_ID = "479c3127-fb07-4cc6-abce-d73a447d2c01";
            
                const signer = provider.getSigner();

                console.log("singer",signer);
                const tx = {
                  to: marketplaceAddress,
                  data: encodedData,
                };
                const txResponse = await signer.sendTransaction(tx);
                const txReceipt = await txResponse.wait();
  
                notification.success({
                  message: 'Transaction Successful',
                  description: (
                    <div>
                      Transaction Hash: <a href={`https://sepolia.lineascan.build/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
                    </div>
                  )
                });
  
                console.log(txReceipt.transactionHash);
            
                
              }catch(error){
                console.log(error)
              }

         
          
        } catch (error) {
          // alert(error)
         
          console.log(error)
          $('.successExecutio1n').css("display","none");
          $('.errorExecution1').css("display","block");
          $('.errorExecution1').text("Error executing/closing the proposal");
          return;
        }
        
        $('#option_execution1').val('');
        $('#passwordShowPVExecution1').val('');
        $('.errorExecution1').css("display","none");
        $('.successExecution1').css("display","block");
        $('.successExecution1').text("The execution was successful ");
      } else {
        // alert(error)
        toast.error(error)
        $('.valid-feedback1').css('display','none');
          $('.invalid-feedback1').css('display','block');
          $('.invalid-feedback1').text('The password is invalid');
      }
    }
    catch {
    
      $('.valid-feedback1').css('display','none');
          $('.invalid-feedback1').css('display','block');
          $('.invalid-feedback1').text('The password is invalid');
    }
    
    
  }

}

async function verify(){
  const clubId =  localStorage.getItem("clubId");
  var proposalId = localStorage.getItem("proposalId");
  var clubs = await contractPublic.methods.getProposalsByClub(clubId).call();
  console.log(clubs)
  const cid= clubs[proposalId-1].Cid;

  const polygonScanlink = `https://gateway.lighthouse.storage/ipfs/${cid}`
            toast.success(<a target="_blank" href={polygonScanlink}>Click to view Data</a>, {
              position: "top-right",
              autoClose: 18000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "dark",
              });
        

}
async function voteOnProposal() {




  var filWalletAddress = localStorage.getItem("filWalletAddress");
  await getContract(filWalletAddress);
  

  var clubId = localStorage.getItem("clubId");
  var proposalId = localStorage.getItem("proposalId");
 

  if(contractPublic != undefined) {
    var option_vote = $('#option_vote').val()
    var password = $('#passwordShowPVVote').val();
    if(option_vote == '') {
      $('#errorCreateProposal').css("display","block");
      $('#errorCreateProposal').text("Vote is required");
      return;
    }
    if(password == '') {
      $('#errorCreateProposal').css("display","block");
      $('#errorCreateProposal').text("Password is invalid");
      return;
    }
   
    const my_wallet = await web3.eth.accounts.wallet.load(password);
    if(my_wallet !== undefined)
    {
      $('.successVote').css("display","block");
      
      $('.successVote').text("Voting...");
      
      var optionBool = option_vote == '1' ? true : false;
      try {
        const ans  = await contractPublic.methods.isVotingOn(clubId,proposalId).call();

        console.log("ans",ans)
       
        if(!ans){
          $('.successVote').css("display","none");
          $('.errorVote').css("display","block");
          $('.errorVote').text("Voting time periods is over!");
          toast.error("Voting time periods is over!");
         
          return;
        }
        
        const query = contractPublic.methods.voteOnProposal(clubId,proposalId, optionBool);
        const encodedABI = query.encodeABI();


        

        const abi = ABI.abi;
              const iface = new ethers.utils.Interface(abi);
              const encodedData = iface.encodeFunctionData("voteOnProposal", [clubId,proposalId, optionBool]);
              const GAS_MANAGER_POLICY_ID = "479c3127-fb07-4cc6-abce-d73a447d2c01";
          
              const signer = provider.getSigner();

              console.log("singer",signer);
              const tx = {
                to: marketplaceAddress,
                data: encodedData,
              };
              const txResponse = await signer.sendTransaction(tx);
              const txReceipt = await txResponse.wait();

              notification.success({
                message: 'Transaction Successful',
                description: (
                  <div>
                    Transaction Hash: <a href={`https://sepolia.lineascan.build/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
                  </div>
                )
              });
              console.log(txReceipt.transactionHash);
       
      } catch (error) {
        console.log(error.message);
        
      
        $('.successVote').css("display","none");
        $('.errorVote').css("display","block");
        $('.errorVote').text("You already voted on this proposal");
        return;
      }
      
      $('#option_vote').val('');
      $('#passwordShowPVVote').val('');
      $('#errorVote').css("display","none");
      $('#successVote').css("display","block");
      $('#successVote').text("Your vote was successful ");
      window.location.reload();
    } else {
      $('.valid-feedback').css('display','none');
        $('.invalid-feedback').css('display','block');
        $('.invalid-feedback').text('The password is invalid');
    }
    
  }
}


async function verifyUserInClub() {
  var clubId = localStorage.getItem("clubId");
  var filWalletAddress = localStorage.getItem("filWalletAddress");
  if(clubId != null) {
    await getContract(filWalletAddress);
    if(contractPublic != undefined) {
      var user = await contractPublic.methods.isMemberOfClub(filWalletAddress,clubId).call();
      if(user) {
        $('.join_club').css('display','none');
        $('.leave_club').css('display','block');
      } else {
        $('.join_club').css('display','block');
        $('.leave_club').css('display','none');
      }
    }
  }
}







  return (
    <div id="page-top">
        <>
  {/* Page Wrapper */}
  <div id="wrapper">
    {/* Sidebar */}
    <ul
      className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion"
      id="accordionSidebar"
    >
      {/* Sidebar - Brand */}
      <a
        className="sidebar-brand d-flex align-items-center justify-content-center"
        href="/"
      >
        <div className="sidebar-brand-icon rotate-n-15">
          <i className="fas fa-laugh-wink" />
        </div>
        <div className="sidebar-brand-text mx-3">Linea Club</div>
      </a>
      {/* Divider */}
      <hr className="sidebar-divider my-0" />
      {/* Nav Item - Dashboard */}
      <li className="nav-item active">
        <a className="nav-link" href="/">
          <i className="fas fa-fw fa-tachometer-alt" />
          <span>Dashboard</span>
        </a>
      </li>
      <li className="nav-item">
        <Link  className=" nav-link" to="joinclub">
          <i className="fas fa-fw fa-file-image-o" />
          <span>Available clubs</span>
          </Link>
        
      </li>
      <li className="nav-item">
      <Link  className="nav-link" to="/createclub">
          <i className="fas fa-fw fa-file-image-o" />
          <span>Create club</span>
        </Link>
      </li>
      {/* Divider */}
      <hr className="sidebar-divider d-none d-md-block" />
      {/* Sidebar Toggler (Sidebar) */}
      <div className="text-center d-none d-md-inline">
        <button  onClick={Tg} className="rounded-circle border-0" id="sidebarToggle" />
      </div>
    </ul>
    {/* End of Sidebar */}
    {/* Content Wrapper */}
    <div id="content-wrapper" className="d-flex flex-column">
      {/* Main Content */}
      <div id="content">
        {/* Topbar */}
        
        {/* End of Topbar */}
        {/* Begin Page Content */}
        <div className="container-fluid">
          {/* Page Heading */}
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800">
              <span className="club_name" />
            </h1>
          </div>
          {/* Content Row */}
          <div className="row">
            {/* Earnings (Monthly) Card Example */}
            <div className="col-xl-2 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Club Balance (ETH)
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800 club_balance">
                        -
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-calendar fa-2x text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Proposals
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800 club_proposals">
                        -
                      </div>
                      <a
                        href="/createproposal"
                        className="btn btn-secondary btn-sm mt-2"
                      >
                        Create
                      </a>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-calendar fa-2x text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                        Proposals{" "}
                      </div>
                      <a className="btn btn-secondary" href="/club">
                        See all proposals
                      </a>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-calendar fa-2x text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div> 

            <div className="col-xl-3 nc col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                        See All Data{" "}
                      </div>
                      
                        <div className="btn btn-primary" onClick={verify}>
                     
                       Verify Dao Data
                       </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-clipboard-list fa-2x text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          {/* Content Row */}
          <div className="row">
            {/* Area Chart */}
            <div className="col-xl-8 col-lg-7">
              <div className="card shadow mb-4">
                {/* Card Header - Dropdown */}
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    Proposal
                  </h6>
                </div>
                {/* Card Body */}
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-12">
                      Description:{" "}
                      <b>
                        <span className="proposal_description" />
                      </b>{" "}
                      <br />
                      Creator:{" "}
                      <b>
                        <span id="proposal_creator" />
                      </b>{" "}
                      <br />
                      Destination:{" "}
                      <b>
                        <span id="proposal_destination" />
                      </b>{" "}
                      <br />
                      Amount (in ETH):{" "}
                      <b>
                        <span id="proposal_amount" />
                      </b>{" "}
                      <br />
                      CID of Document :{" "}
                      <b>
                        <span id="CID" />
                      </b>{" "}
                      <br />
                      Voting perios Starts At:{""}
                      <b>
                        <span id="proposedAt" /> 
                      </b>{""}
                      <br />
                      Voting Period Ends At:{""}
                      <b>
                        <span id="proposalExpireAt" />
                      </b>{""}
                      <br />
                      Votes:  <br />
                    </div>
                  </div>
                  <div className="row my_votes">
                    <span className="loading_message">Loading...</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Pie Chart */}
            <div className="col-xl-4 col-lg-5">
              <div
                className="card shadow mb-4 leave_club"
                style={{ display: "none" }}
              >
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">
                    Status: <span id="proposal_status" />
                  </h6>
                </div>
                <div className="card-body">
                  <p>
                    Votes for:{" "}
                    <b>
                      <span id="votes_for" />
                    </b>{" "}
                    <br />
                    Votes against:{" "}
                    <b>
                      <span id="votes_against" />
                    </b>{" "}
                    <br />
                  </p>
                  <p className="votes_available">
                    Option: <br />
                    <select id="option_vote" className="form-control">
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>{" "}
                    <br />
                    
                    <div 
                     onClick={() => {
                        voteOnProposal();
                      }}id="btnVote" className="btn btn-success">
                      Confirm
                    </div>{" "}
                    <br />
                  </p>
                  <div
                    className="successVote valid-feedback"
                    style={{ display: "none" }}
                  />
                  <div
                    className="errorVote invalid-feedback"
                    style={{ display: "none" }}
                  />
                  <p />
                </div>
              </div>
              <div
                className="card shadow mb-4 creator_options"
                style={{ display: "none" }}
              >
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Options</h6>
                </div>
                <div className="card-body">
                  <p>
                    Select an option: <br />
                    <select id="option_execution" className="form-control">
                      <option value="execute">Execute proposal</option>
                      <option value="close">Close proposal</option>
                    </select>{" "}
                    <br />
                   
                    <div href="" id="btnExecution" onClick={() => {
                        runProposal();
                      }} className="btn btn-success">
                      Confirm
                    </div>{" "}
                    <br />
                  </p>
                  <div
                    className="successExecution valid-feedback"
                    style={{ display: "none" }}
                  />
                  <div
                    className="errorExecution invalid-feedback"
                    style={{ display: "none" }}
                  />
                  <p />
                </div>
              </div>
              <div
                className="card shadow mb-4 creator_options"
                style={{ display: "none" }}
              >
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Options</h6>
                </div>
                <div className="card-body">
                  <p>
                    Save Data on blockchain <br />
                    
                    <br />
                   
                    <div href="" id="btnExecution" onClick={() => {
                        SaveDataToBlockchain();
                      }} className="btn btn-success">
                      Confirm
                    </div>{" "}
                    <br />
                  </p>
                  <div
                    className="successExecution1 valid-feedback1"
                    style={{ display: "none" }}
                  />
                  <div
                    className="errorExecution1 invalid-feedback1"
                    style={{ display: "none" }}
                  />
                  <p />
                </div>
              </div>
            </div>
          </div>
          {/* Content Row */}
          <div className="row">
            <div className="col-lg-6 mb-4"></div>
          </div>
        </div>
        {/* /.container-fluid */}
      </div>
      {/* End of Main Content */}
      {/* Footer */}
      <footer className="sticky-footer bg-white"></footer>
      {/* End of Footer */}
    </div>
    {/* End of Content Wrapper */}
  </div>
  {/* End of Page Wrapper */}
  {/* Scroll to Top Button*/}
  <a className="scroll-to-top rounded" href="#page-top">
    <i className="fas fa-angle-up" />
  </a>
  {/* Logout Modal*/}
  <div
    className="modal fade"
    id="seeAccountModal"
    tabIndex={-1}
    role="dialog"
    aria-labelledby="exampleModalLabel"
    aria-hidden="true"
  >
    <div className="modal-dialog" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title" id="exampleModalLabel">
            Account
          </h5>
          <button
            className="close"
            type="button"
            data-dismiss="modal"
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="modal-body">
          Address: <br /> <div className="current_account" />
          <br />
          <span
            style={{ fontSize: "x-small" }}
            className="current_account_text"
          />
        </div>
        <div className="modal-footer"></div>
      </div>
    </div>
  </div>
  {/* Logout Modal*/}
  <div
    className="modal fade"
    id="logoutModal"
    tabIndex={-1}
    role="dialog"
    aria-labelledby="exampleModalLabel"
    aria-hidden="true"
  >
    <div className="modal-dialog" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title" id="exampleModalLabel">
            Ready to Leave?
          </h5>
          <button
            className="close"
            type="button"
            data-dismiss="modal"
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="modal-body">
          Select "Logout" below if you are ready to end your current session in
          this browser.
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            type="button"
            data-dismiss="modal"
          >
            Cancel
          </button>
          <div className="btn btn-primary" onClick={Logout} id="btnLogout">
            Logout
          </div>
        </div>
      </div>
    </div>
  </div>
</>

    </div>
  )
}

// getClub();
//             verifyUserInClub();
//             getProposalById();

export default Proposal