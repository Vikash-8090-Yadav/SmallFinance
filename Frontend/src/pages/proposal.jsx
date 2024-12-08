'use client'

import React, { useState, useEffect } from "react";



import { ethers } from 'ethers'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

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
  var club = await contractPublic.methods.getClubById(clubId).call();


  const poolBalanceWei = club.pool;
  const poolBalanceEther = web3.utils.fromWei(poolBalanceWei.toString(), 'ether');

  const destination = clubs.destination.toString();
  const amount =clubs.amount.toString();

  const proposalamnt = web3.utils.fromWei(clubs.amount.toString(), 'ether');

  

        
  var DealId = null;


  const payeeIdentity = destination;
  const payerIdentity = marketplaceAddress; 
  const paymentRecipient = payeeIdentity;
  const feeRecipient = '0x0000000000000000000000000000000000000000';



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

    const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState('');
    

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
      setIsLoading(true);
      setProgress('');
    
      const createRequest = async () => {
        if (window.ethereum) {
          try {
            setProgress('Creating request...');
            const signer = provider.getSigner();
            const web3SignatureProvider = new Web3SignatureProvider(provider.provider);
    
            const requestClient = new RequestNetwork({
              nodeConnectionConfig: { baseURL: "https://sepolia.gateway.request.network/" },
              signatureProvider: web3SignatureProvider,
            });
    
            const request = await requestClient.createRequest(requestCreateParameters);
            setProgress('Waiting for confirmation...');
            const confirmedRequestData = await request.waitForConfirmation();
            console.log("Request ID:", request.requestId);
    
            setProgress('Processing payment...');
            let requestData = request.getData();
            const paymentTx = await payRequest(requestData, signer);
            await paymentTx.wait(2);
    
            while (requestData.balance?.balance < requestData.expectedAmount) {
              requestData = await request.refresh();
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
    
            console.log("Payment completed:", requestData);
            setProgress('Payment completed!');
          } catch (error) {
            console.error("Error during payment processing:", error);
            setProgress('Error: ' + error.message);
            $('.errorExecution').css("display", "block").text("Error processing payment");
          }
        } else {
          console.error("MetaMask not available");
          setProgress('Error: MetaMask not available');
          $('.errorExecution').css("display", "block").text("MetaMask not available");
        }
      };
    
      const executeOrCloseProposal = async (action, clubId, proposalId) => {
        try {
          setProgress(`${action === 'execute' ? 'Executing' : 'Closing'} proposal...`);
    
          const isVotingOn = await contractPublic.methods.isVotingOn(clubId, proposalId).call();
          if (isVotingOn) {
            throw new Error("Voting is still ON");
          }
    
          const abi = ABI.abi;
          const iface = new ethers.utils.Interface(abi);
          const functionName = action === "execute" ? "executeProposal" : "closeProposal";
          const encodedData = iface.encodeFunctionData(functionName, [clubId, proposalId]);
    
          const signer = provider.getSigner();
          const tx = {
            to: marketplaceAddress,
            data: encodedData,
          };
    
          const txResponse = await signer.sendTransaction(tx);
          setProgress('Waiting for transaction confirmation...');
          const txReceipt = await txResponse.wait();
    
          setProgress('Transaction confirmed!');
          console.log("Transaction Hash:", txReceipt.transactionHash);
    
          notification.success({
            message: 'Transaction Successful',
            description: (
              <div>
                Transaction Hash:{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {txReceipt.transactionHash}
                </a>
              </div>
            ),
          });
    
          if (action === 'close') setIsVisible(false);
        } catch (error) {
          console.error(`Error during proposal ${action}:`, error);
          setProgress(`Error: ${error.message}`);
          $('.errorExecution').css("display", "block").text(`Error: ${error.message}`);
        }
      };
    
      const filWalletAddress = localStorage.getItem("filWalletAddress");
      await getContract(filWalletAddress);
    
      if (contractPublic) {
        const option_execution = $('#option_execution').val();
        const clubId = localStorage.getItem("clubId");
        const proposalId = localStorage.getItem("proposalId");
    
        if (!option_execution) {
          setProgress('Error: Option is required');
          $('.errorExecution').css("display", "block").text("Option is required");
          setIsLoading(false);
          return;
        }
    
        if (option_execution === "execute") {
          const isVotingOn = await contractPublic.methods.isVotingOn(clubId, proposalId).call();
          if (isVotingOn) {
            setProgress('Error: Voting is still ON');
            $('.errorExecution').css("display", "block").text("Voting is still ON");
            setIsLoading(false);
            return;
          }

          if(proposalamnt>poolBalanceEther){

            notification.error({
              message: 'Club has Less balance than requested'
              
            })

            $('.errorExecution').css("display", "block").text("Club has Less balance than requested");
            return;
          }
    
          await createRequest();
          await executeOrCloseProposal("execute", clubId, proposalId);
        } else if (option_execution === "close") {
          await executeOrCloseProposal("close", clubId, proposalId);
        }
      } else {
        console.error("Contract not initialized");
        setProgress('Error: Contract not initialized');
        $('.errorExecution').css("display", "block").text("Contract not initialized");
      }
    
      setIsLoading(false);
    }
  

    if (!isVisible) {
      return null;
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
                    Transaction Hash: <a href={`https://sepolia.etherscan.io/tx/${txReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{txReceipt.transactionHash}</a>
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
        <div className="sidebar-brand-text mx-3">Small Finance</div>
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
    <select id="option_execution" className="form-control mb-4">
      <option value="execute">Execute proposal</option>
      <option value="close">Close proposal</option>
    </select>
    <button
      onClick={runProposal}
      disabled={isLoading}
      className={`w-full py-2 px-4 font-semibold rounded-lg shadow-md ${
        isLoading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isLoading ? 'Processing...' : 'Confirm'}
    </button>
  </p>
  {progress && (
    <div className="mt-4">
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: isLoading ? '100%' : '0%' }}
        ></div>
      </div>
      <p className="text-sm text-gray-600 mt-2">{progress}</p>
    </div>
  )}
  <div
    className="successExecution valid-feedback mt-2"
    style={{ display: "none" }}
  />
  <div
    className="errorExecution invalid-feedback mt-2"
    style={{ display: "none" }}
  />
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
